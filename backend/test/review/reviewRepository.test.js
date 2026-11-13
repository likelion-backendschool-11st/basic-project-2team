'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createReviewRepository } = require('../../src/review/reviewRepository');

const REVIEWER = 1;
const TARGET_A = 2;
const TARGET_B = 3;

/**
 * mysql2 connection 흉내: createReviews · recalculateMannerTemps 가 보내는 SQL 만 메모리 상태에 반영합니다.
 * beginTransaction 때 상태를 복사해 두고 rollback 하면 되돌립니다.
 */
function createFakePool() {
  let db;
  let snapshot = null;
  const calls = { commit: 0, rollback: 0, release: 0 };
  const options = { failOnTarget: null };

  const reset = () => {
    db = {
      members: new Map([
        [REVIEWER, { id: REVIEWER, mannerTemp: '36.5', reviewCount: 0, activityPoint: 45, level: 1 }],
        [TARGET_A, { id: TARGET_A, mannerTemp: '99.8', reviewCount: 10, activityPoint: 0, level: 1 }],
        [TARGET_B, { id: TARGET_B, mannerTemp: '0.5', reviewCount: 3, activityPoint: 0, level: 7 }],
      ]),
      reviews: [],
      tagMaps: [],
      pointLogs: [],
      nextReviewId: 100,
    };
    Object.assign(calls, { commit: 0, rollback: 0, release: 0 });
    options.failOnTarget = null;
  };
  reset();

  const clone = (value) => structuredClone(value);

  const connection = {
    async beginTransaction() {
      snapshot = clone(db);
    },
    async commit() {
      calls.commit += 1;
      snapshot = null;
    },
    async rollback() {
      calls.rollback += 1;
      if (snapshot) db = snapshot;
      snapshot = null;
    },
    release() {
      calls.release += 1;
    },
    async query(sql, params = []) {
      const text = sql.replace(/\s+/g, ' ').trim();
      if (text.startsWith('SELECT id, manner_temp AS mannerTemp, review_count AS reviewCount FROM member WHERE id IN')) {
        return [params[0].map((id) => db.members.get(id)).filter(Boolean).map(({ id, mannerTemp, reviewCount }) => ({ id, mannerTemp, reviewCount }))];
      }
      if (text.startsWith('SELECT id, manner_temp AS mannerTemp, review_count AS reviewCount FROM member ORDER BY id')) {
        return [[...db.members.values()].map(({ id, mannerTemp, reviewCount }) => ({ id, mannerTemp, reviewCount }))];
      }
      if (text.startsWith('INSERT INTO review ')) {
        const [postId, reviewerId, targetId, rating, comment] = params;
        if (targetId === options.failOnTarget) {
          throw Object.assign(new Error("Duplicate entry for key 'review.uq_review'"), { code: 'ER_DUP_ENTRY' });
        }
        const id = db.nextReviewId++;
        db.reviews.push({ id, postId, reviewerId, targetId, rating, comment });
        return [{ insertId: id }];
      }
      if (text.startsWith('INSERT INTO review_tag_map')) {
        db.tagMaps.push(...params[0]);
        return [{}];
      }
      if (text.startsWith('UPDATE member SET manner_temp = ?, review_count = review_count + 1')) {
        const member = db.members.get(params[1]);
        member.mannerTemp = String(params[0]);
        member.reviewCount += 1;
        return [{ affectedRows: 1 }];
      }
      if (text.startsWith('UPDATE member SET manner_temp = ?, review_count = ? WHERE id = ?')) {
        Object.assign(db.members.get(params[2]), { mannerTemp: String(params[0]), reviewCount: params[1] });
        return [{ affectedRows: 1 }];
      }
      if (text.startsWith('INSERT INTO activity_point_log')) {
        db.pointLogs.push(...params[0]);
        return [{}];
      }
      if (text.startsWith('SELECT activity_point AS activityPoint, level FROM member')) {
        const { activityPoint, level } = db.members.get(params[0]);
        return [[{ activityPoint, level }]];
      }
      if (text.startsWith('UPDATE member SET activity_point = ?, level = ?')) {
        Object.assign(db.members.get(params[2]), { activityPoint: params[0], level: params[1] });
        return [{ affectedRows: 1 }];
      }
      if (text.startsWith('SELECT target_id AS targetId, rating FROM review')) {
        const ids = params[0];
        return [db.reviews.filter((r) => !ids || ids.includes(r.targetId)).map((r) => ({ targetId: r.targetId, rating: r.rating }))];
      }
      throw new Error(`예상하지 못한 SQL: ${text}`);
    },
  };

  return {
    pool: { getConnection: async () => connection },
    get db() {
      return db;
    },
    calls,
    options,
    reset,
  };
}

describe('reviewRepository — 평가 저장 트랜잭션', () => {
  const fake = createFakePool();
  const repo = createReviewRepository(fake.pool);
  beforeEach(() => fake.reset());

  const submit = () =>
    repo.createReviews({
      postId: 10,
      reviewerId: REVIEWER,
      reviews: [
        { targetMemberId: TARGET_A, rating: 5, comment: '최고', tagIds: [1, 2] },
        { targetMemberId: TARGET_B, rating: 1, comment: null, tagIds: [] },
      ],
    });

  it('대상 매너 온도(상·하한 보정)와 받은 평가 수를 갱신하고 커밋한다', async () => {
    assert.deepEqual(await submit(), [100, 101]);
    assert.equal(fake.db.members.get(TARGET_A).mannerTemp, '99.9');
    assert.equal(fake.db.members.get(TARGET_A).reviewCount, 11);
    assert.equal(fake.db.members.get(TARGET_B).mannerTemp, '0');
    assert.equal(fake.db.members.get(TARGET_B).reviewCount, 4);
    assert.deepEqual(fake.db.tagMaps, [[100, 1], [100, 2]]);
    assert.deepEqual(fake.calls, { commit: 1, rollback: 0, release: 1 });
  });

  it('평가자에게 리뷰 1건마다 REVIEW_WRITE +5 를 지급하고 레벨을 다시 계산한다', async () => {
    await submit();
    assert.deepEqual(fake.db.pointLogs, [
      [REVIEWER, 'REVIEW_WRITE', 100, 5],
      [REVIEWER, 'REVIEW_WRITE', 101, 5],
    ]);
    // 45 + 10 = 55점 → Lv.2 (50점부터)
    assert.equal(fake.db.members.get(REVIEWER).activityPoint, 55);
    assert.equal(fake.db.members.get(REVIEWER).level, 2);
  });

  it('도중에 실패하면 롤백되어 평가 · 매너 온도 · 활동 점수가 하나도 반영되지 않는다', async () => {
    fake.options.failOnTarget = TARGET_B;
    await assert.rejects(submit(), { code: 'ER_DUP_ENTRY' });
    assert.deepEqual(fake.calls, { commit: 0, rollback: 1, release: 1 });
    assert.equal(fake.db.reviews.length, 0);
    assert.equal(fake.db.members.get(TARGET_A).mannerTemp, '99.8');
    assert.equal(fake.db.members.get(TARGET_A).reviewCount, 10);
    assert.equal(fake.db.pointLogs.length, 0);
    assert.equal(fake.db.members.get(REVIEWER).activityPoint, 45);
  });

  it('지급으로 레벨이 내려가지는 않는다 (점수 없이 레벨만 있는 회원)', async () => {
    await repo.createReviews({
      postId: 10,
      reviewerId: TARGET_B,
      reviews: [{ targetMemberId: TARGET_A, rating: 3, comment: null, tagIds: [] }],
    });
    assert.equal(fake.db.members.get(TARGET_B).activityPoint, 5);
    assert.equal(fake.db.members.get(TARGET_B).level, 7);
  });
});

describe('reviewRepository — 매너 온도 재계산', () => {
  const fake = createFakePool();
  const repo = createReviewRepository(fake.pool);
  beforeEach(() => fake.reset());

  it('리뷰 행만으로 처음부터 다시 계산해 어긋난 값을 바로잡는다 (리뷰 없는 회원은 36.5 · 0건)', async () => {
    fake.db.reviews.push(
      { id: 1, targetId: TARGET_A, rating: 5 },
      { id: 2, targetId: TARGET_A, rating: 4 },
      { id: 3, targetId: TARGET_B, rating: 1 },
    );
    assert.equal(await repo.recalculateMannerTemps(), 2);
    assert.deepEqual(
      [...fake.db.members.values()].map(({ id, mannerTemp, reviewCount }) => ({ id, mannerTemp, reviewCount })),
      [
        { id: REVIEWER, mannerTemp: '36.5', reviewCount: 0 },
        { id: TARGET_A, mannerTemp: '37.2', reviewCount: 2 },
        { id: TARGET_B, mannerTemp: '35.5', reviewCount: 1 },
      ],
    );
    assert.equal(fake.calls.commit, 1);
  });

  it('평가 저장으로 쌓인 값과 재계산 결과가 같다', async () => {
    for (const id of [TARGET_A, TARGET_B]) Object.assign(fake.db.members.get(id), { mannerTemp: '36.5', reviewCount: 0 });
    await submit();
    assert.equal(await repo.recalculateMannerTemps([TARGET_A, TARGET_B]), 0);

    function submit() {
      return repo.createReviews({
        postId: 10,
        reviewerId: REVIEWER,
        reviews: [
          { targetMemberId: TARGET_A, rating: 4, comment: null, tagIds: [] },
          { targetMemberId: TARGET_B, rating: 2, comment: null, tagIds: [] },
        ],
      });
    }
  });
});
