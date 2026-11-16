'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  DAILY_LIMITS,
  MAX_LEVEL,
  levelProgress,
  startOfKstDay,
  awardDailyLimitedPoints,
  revokeActivityPoints,
} = require('../../src/common/activityPoint');

/**
 * mysql2 connection 흉내: activityPoint.js 가 보내는 SQL 만 메모리 상태(member · activity_point_log)에 반영합니다.
 * created_at 은 now 로 주입한 시각을 씁니다(실제 DB 의 DEFAULT CURRENT_TIMESTAMP 대신).
 */
function createFakeConnection() {
  const state = { members: new Map(), logs: [], now: new Date('2026-11-16T03:00:00Z') };

  const connection = {
    async query(sql, params = []) {
      const text = sql.replace(/\s+/g, ' ').trim();
      if (text === 'SELECT id FROM member WHERE id = ? FOR UPDATE') return [[{ id: params[0] }]];
      if (text.startsWith('SELECT COUNT(*) AS count FROM activity_point_log')) {
        const [memberId, actionType, from] = params;
        const count = state.logs.filter((l) => l.memberId === memberId && l.actionType === actionType && l.createdAt >= from).length;
        return [[{ count }]];
      }
      if (text.startsWith('INSERT INTO activity_point_log')) {
        for (const [memberId, actionType, refId, point] of params[0]) {
          if (state.logs.some((l) => l.memberId === memberId && l.actionType === actionType && l.refId === refId)) {
            throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
          }
          state.logs.push({ memberId, actionType, refId, point, createdAt: state.now });
        }
        return [{}];
      }
      if (text.startsWith('SELECT activity_point AS activityPoint, level FROM member WHERE id = ? FOR UPDATE')) {
        const m = state.members.get(params[0]);
        return [[{ activityPoint: m.activityPoint, level: m.level }]];
      }
      if (text.startsWith('SELECT id, activity_point AS activityPoint, level FROM member WHERE id IN')) {
        return [params[0].map((id) => state.members.get(id)).map((m) => ({ id: m.id, activityPoint: m.activityPoint, level: m.level }))];
      }
      if (text.startsWith('SELECT member_id AS memberId, ref_id AS refId, point FROM activity_point_log WHERE action_type = ?')) {
        const [actionType, refIds] = params;
        return [state.logs.filter((l) => l.actionType === actionType && refIds.includes(l.refId))];
      }
      if (text.startsWith('SELECT member_id AS memberId, ref_id AS refId FROM activity_point_log WHERE action_type = ?')) {
        const [actionType, refIds] = params;
        return [state.logs.filter((l) => l.actionType === actionType && refIds.includes(l.refId))];
      }
      if (text.startsWith('UPDATE member SET activity_point = ?, level = ? WHERE id = ?')) {
        const [activityPoint, level, id] = params;
        Object.assign(state.members.get(id), { activityPoint, level });
        return [{}];
      }
      throw new Error(`unexpected SQL: ${text}`);
    },
  };
  return { connection, state };
}

const addMember = (state, id, activityPoint = 0, level = 1) => state.members.set(id, { id, activityPoint, level });

describe('levelProgress', () => {
  it('이번 레벨에서 모은 점수와 다음 레벨까지 필요한 점수 폭을 돌려준다', () => {
    // Lv.1: 0 ~ 50점, Lv.2: 50 ~ 150점
    assert.deepEqual(levelProgress(1, 0), { activityPoint: 0, current: 0, required: 50, percent: 0 });
    assert.deepEqual(levelProgress(1, 30), { activityPoint: 30, current: 30, required: 50, percent: 60 });
    assert.deepEqual(levelProgress(2, 50), { activityPoint: 50, current: 0, required: 100, percent: 0 });
    assert.deepEqual(levelProgress(2, 149), { activityPoint: 149, current: 99, required: 100, percent: 99 });
  });

  it('레벨이 점수보다 높으면(시드·관리자 데이터) 0 에서 시작한다', () => {
    assert.deepEqual(levelProgress(48, 0), { activityPoint: 0, current: 0, required: 2400, percent: 0 });
  });

  it('최고 레벨이면 required 는 null, percent 는 100', () => {
    assert.deepEqual(levelProgress(MAX_LEVEL, 999999), { activityPoint: 999999, current: 0, required: null, percent: 100 });
  });
});

describe('startOfKstDay', () => {
  it('한국 시간 자정(UTC 전날 15시)을 돌려준다', () => {
    assert.equal(startOfKstDay(new Date('2026-11-16T03:00:00Z')).toISOString(), '2026-11-15T15:00:00.000Z');
    // UTC 16일 15시 = KST 17일 0시 → 새 날
    assert.equal(startOfKstDay(new Date('2026-11-16T15:00:00Z')).toISOString(), '2026-11-16T15:00:00.000Z');
    assert.equal(startOfKstDay(new Date('2026-11-16T14:59:59Z')).toISOString(), '2026-11-15T15:00:00.000Z');
  });
});

describe('awardDailyLimitedPoints', () => {
  let fake;
  beforeEach(() => {
    fake = createFakeConnection();
    addMember(fake.state, 1);
  });

  it('공고 작성은 하루 3회까지 +10 씩 지급한다', async () => {
    const { connection, state } = fake;
    const results = [];
    for (let refId = 1; refId <= 4; refId += 1) {
      results.push(await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'POST_CREATE', refId, now: state.now }));
    }
    assert.deepEqual(results, [true, true, true, false]);
    assert.equal(DAILY_LIMITS.POST_CREATE, 3);
    assert.equal(state.members.get(1).activityPoint, 30);
  });

  it('댓글 작성은 하루 10회까지 +2 씩 지급하고, 다음 날(KST)에는 다시 받는다', async () => {
    const { connection, state } = fake;
    for (let refId = 1; refId <= 11; refId += 1) {
      await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'COMMENT_CREATE', refId, now: state.now });
    }
    assert.equal(state.members.get(1).activityPoint, 20);

    state.now = new Date('2026-11-16T15:00:00Z'); // KST 17일 0시
    assert.equal(await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'COMMENT_CREATE', refId: 12, now: state.now }), true);
    assert.equal(state.members.get(1).activityPoint, 22);
  });

  it('지급으로 레벨이 오른다 (50점 = Lv.2)', async () => {
    const { connection, state } = fake;
    state.members.get(1).activityPoint = 40;
    await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'POST_CREATE', refId: 1, now: state.now });
    assert.deepEqual(state.members.get(1), { id: 1, activityPoint: 50, level: 2 });
  });
});

describe('revokeActivityPoints', () => {
  let fake;
  beforeEach(() => {
    fake = createFakeConnection();
  });

  it('받은 점수를 같은 양만큼 회수하고 레벨도 내린다', async () => {
    const { connection, state } = fake;
    addMember(state, 1, 45);
    await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'POST_CREATE', refId: 7, now: state.now });
    assert.equal(state.members.get(1).level, 2);

    await revokeActivityPoints(connection, 'POST_CREATE', [7]);
    assert.deepEqual(state.members.get(1), { id: 1, activityPoint: 45, level: 1 });
    assert.deepEqual(state.logs.at(-1), { memberId: 1, actionType: 'POST_REVOKE', refId: 7, point: -10, createdAt: state.now });
  });

  it('이미 회수했거나 점수를 받지 않은 글은 건너뛴다', async () => {
    const { connection, state } = fake;
    addMember(state, 1, 0);
    await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'COMMENT_CREATE', refId: 1, now: state.now });
    await revokeActivityPoints(connection, 'COMMENT_CREATE', [1, 99]);
    await revokeActivityPoints(connection, 'COMMENT_CREATE', [1]);
    assert.equal(state.members.get(1).activityPoint, 0);
    assert.equal(state.logs.filter((l) => l.actionType === 'COMMENT_REVOKE').length, 1);
  });

  it('댓글과 대댓글을 함께 지우면 각 작성자에게서 회수한다', async () => {
    const { connection, state } = fake;
    addMember(state, 1, 0);
    addMember(state, 2, 0);
    await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'COMMENT_CREATE', refId: 10, now: state.now });
    await awardDailyLimitedPoints(connection, { memberId: 2, actionType: 'COMMENT_CREATE', refId: 11, now: state.now });
    await awardDailyLimitedPoints(connection, { memberId: 2, actionType: 'COMMENT_CREATE', refId: 12, now: state.now });

    await revokeActivityPoints(connection, 'COMMENT_CREATE', [10, 11]);
    assert.equal(state.members.get(1).activityPoint, 0);
    assert.equal(state.members.get(2).activityPoint, 2);
  });

  it('점수 없이 레벨만 있던 회원은 점수로 계산한 레벨이 줄어든 만큼만 내린다', async () => {
    const { connection, state } = fake;
    addMember(state, 1, 45, 30); // 기존 데이터: 점수 45 에 레벨 30
    await awardDailyLimitedPoints(connection, { memberId: 1, actionType: 'POST_CREATE', refId: 1, now: state.now });
    assert.equal(state.members.get(1).level, 30); // 지급은 레벨을 내리지 않음

    await revokeActivityPoints(connection, 'POST_CREATE', [1]);
    // 55점(Lv.2) → 45점(Lv.1): 한 단계만 내려감
    assert.deepEqual(state.members.get(1), { id: 1, activityPoint: 45, level: 29 });
  });
});
