'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const HOST = 1;
const MEMBER_A = 2;
const MEMBER_B = 3;
const OUTSIDER = 9;
const POST_ID = 10;

const TAGS = [
  { id: 1, code: 'on-time', label: '#시간엄수', active: true },
  { id: 2, code: 'kind', label: '#친절함', active: true },
  { id: 3, code: 'retired', label: '#옛태그', active: false },
];

const memberRow = (id, overrides) => ({
  id,
  nickname: `회원${id}`,
  avatarUrl: null,
  level: 40 + id,
  isHost: id === HOST ? 1 : 0,
  role: id === HOST ? null : '딜러',
  characterName: id === MEMBER_A ? '버서커' : null,
  ...overrides,
});

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { post: null, members: [], reviews: [], nextId: 100, failWith: null };
  return {
    state,
    async findActiveReviewTags() {
      return TAGS.filter((tag) => tag.active).map(({ id, code, label }) => ({ id, code, label }));
    },
    async findPost(postId) {
      return state.post && state.post.id === postId ? state.post : null;
    },
    async findPartyMembers(postId) {
      return state.post && state.post.id === postId ? state.members : [];
    },
    async findReviewedTargetIds(postId, reviewerId) {
      return state.reviews.filter((r) => r.postId === postId && r.reviewerId === reviewerId).map((r) => r.targetMemberId);
    },
    async createReviews({ postId, reviewerId, reviews }) {
      if (state.failWith) throw state.failWith;
      return reviews.map((review) => {
        const id = state.nextId++;
        state.reviews.push({ id, postId, reviewerId, ...review });
        return id;
      });
    },
  };
}

describe('리뷰 API', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ reviewRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.post = { id: POST_ID, authorId: HOST, status: 'COMPLETED', gameName: '로스트아크' };
    repo.state.members = [memberRow(HOST), memberRow(MEMBER_A), memberRow(MEMBER_B)];
    repo.state.reviews = [];
    repo.state.failWith = null;
  });

  const auth = (memberId) => (memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {});
  const getTargets = (postId = POST_ID, memberId = HOST) =>
    fetch(`${baseUrl}/api/posts/${postId}/reviews/targets`, { headers: auth(memberId) });
  const submit = (body, memberId = HOST, postId = POST_ID) =>
    fetch(`${baseUrl}/api/posts/${postId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(memberId) },
      body: JSON.stringify(body),
    });
  const review = (overrides) => ({ targetMemberId: MEMBER_A, rating: 5, tags: ['on-time'], comment: '최고!', ...overrides });
  const expectError = async (res, status, code) => {
    assert.equal(res.status, status);
    const json = await res.json();
    assert.equal(json.error.code, code);
    return json.error;
  };

  describe('GET /api/review-tags', () => {
    it('활성 태그만 code·label 로 돌려준다 (로그인 불필요)', async () => {
      const res = await fetch(`${baseUrl}/api/review-tags`);
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data, [
        { code: 'on-time', label: '#시간엄수' },
        { code: 'kind', label: '#친절함' },
      ]);
    });
  });

  describe('GET /api/posts/:postId/reviews/targets', () => {
    it('본인을 뺀 파티원과 평가 여부를 돌려준다', async () => {
      repo.state.reviews.push({ postId: POST_ID, reviewerId: MEMBER_A, targetMemberId: HOST });
      const res = await getTargets(POST_ID, MEMBER_A);
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data, [
        { id: HOST, nickname: '회원1', avatarUrl: null, level: 41, game: '로스트아크', characterName: null, role: null, isHost: true, reviewed: true },
        { id: MEMBER_B, nickname: '회원3', avatarUrl: null, level: 43, game: '로스트아크', characterName: null, role: '딜러', isHost: false, reviewed: false },
      ]);
    });

    it('파티원이 아니면 403 NOT_PARTY_MEMBER', async () => {
      await expectError(await getTargets(POST_ID, OUTSIDER), 403, 'NOT_PARTY_MEMBER');
    });

    it('활동 완료 전이면 409 POST_NOT_COMPLETED', async () => {
      repo.state.post.status = 'CLOSED';
      await expectError(await getTargets(), 409, 'POST_NOT_COMPLETED');
    });

    it('없는 공고·잘못된 postId 는 404 POST_NOT_FOUND', async () => {
      for (const id of ['999', 'abc', '0', '-1']) {
        await expectError(await getTargets(id), 404, 'POST_NOT_FOUND');
      }
    });

    it('로그인하지 않으면 401', async () => {
      assert.equal((await getTargets(POST_ID, null)).status, 401);
    });
  });

  describe('POST /api/posts/:postId/reviews', () => {
    it('여러 파티원 평가를 한 번에 저장하고 201 { reviewIds } 를 돌려준다', async () => {
      const res = await submit({
        reviews: [review(), review({ targetMemberId: MEMBER_B, rating: 3, tags: ['kind', 'kind'], comment: '  ' })],
      });
      assert.equal(res.status, 201);
      assert.deepEqual((await res.json()).data, { reviewIds: [100, 101] });
      assert.deepEqual(
        repo.state.reviews.map(({ targetMemberId, rating, comment, tagIds }) => ({ targetMemberId, rating, comment, tagIds })),
        [
          { targetMemberId: MEMBER_A, rating: 5, comment: '최고!', tagIds: [1] },
          { targetMemberId: MEMBER_B, rating: 3, comment: null, tagIds: [2] },
        ],
      );
    });

    it('파티원(승인된 신청자)도 파티장을 평가할 수 있고, tags·comment 는 생략할 수 있다', async () => {
      const res = await submit({ reviews: [{ targetMemberId: HOST, rating: 4 }] }, MEMBER_A);
      assert.equal(res.status, 201);
      assert.deepEqual(repo.state.reviews[0].tagIds, []);
    });

    it('입력값이 틀리면 400 INVALID_INPUT 과 필드별 오류', async () => {
      const error = await expectError(
        await submit({
          reviews: [
            review({ targetMemberId: HOST }),
            review({ targetMemberId: 'abc', rating: 0 }),
            review({ rating: 2.5, tags: 'on-time', comment: 'x'.repeat(501) }),
            review(),
          ],
        }),
        400,
        'INVALID_INPUT',
      );
      assert.deepEqual(
        error.fields.map((f) => f.field),
        [
          'reviews[0].targetMemberId',
          'reviews[1].targetMemberId',
          'reviews[1].rating',
          'reviews[2].rating',
          'reviews[2].tags',
          'reviews[2].comment',
          'reviews[3].targetMemberId',
        ],
      );
      assert.equal(repo.state.reviews.length, 0);
    });

    it('reviews 가 비었거나 배열이 아니면 400', async () => {
      for (const body of [{}, { reviews: [] }, { reviews: 'x' }, { reviews: Array(16).fill(review()) }]) {
        const error = await expectError(await submit(body), 400, 'INVALID_INPUT');
        assert.equal(error.fields[0].field, 'reviews');
      }
    });

    it('없거나 비활성인 태그는 400', async () => {
      const error = await expectError(await submit({ reviews: [review({ tags: ['on-time', 'retired'] })] }), 400, 'INVALID_INPUT');
      assert.deepEqual(error.fields, [{ field: 'reviews[0].tags', message: '존재하지 않는 평가 태그입니다.' }]);
    });

    it('평가자가 파티원이 아니면 403 NOT_PARTY_MEMBER', async () => {
      await expectError(await submit({ reviews: [review()] }, OUTSIDER), 403, 'NOT_PARTY_MEMBER');
    });

    it('대상이 파티원이 아니면 403 REVIEW_TARGET_NOT_PARTY_MEMBER 이고 아무것도 저장하지 않는다', async () => {
      await expectError(
        await submit({ reviews: [review(), review({ targetMemberId: OUTSIDER })] }),
        403,
        'REVIEW_TARGET_NOT_PARTY_MEMBER',
      );
      assert.equal(repo.state.reviews.length, 0);
    });

    it('활동 완료 전이면 409 POST_NOT_COMPLETED', async () => {
      repo.state.post.status = 'OPEN';
      await expectError(await submit({ reviews: [review()] }), 409, 'POST_NOT_COMPLETED');
    });

    it('이미 평가한 대상이 있으면 409 ALREADY_REVIEWED', async () => {
      assert.equal((await submit({ reviews: [review()] })).status, 201);
      await expectError(await submit({ reviews: [review({ targetMemberId: MEMBER_B }), review()] }), 409, 'ALREADY_REVIEWED');
      assert.equal(repo.state.reviews.length, 1);
    });

    it('저장 중 UQ 위반이 나면 409 ALREADY_REVIEWED', async () => {
      repo.state.failWith = Object.assign(new Error("Duplicate entry '10-1-2' for key 'review.uq_review'"), {
        code: 'ER_DUP_ENTRY',
      });
      await expectError(await submit({ reviews: [review()] }), 409, 'ALREADY_REVIEWED');
    });

    it('없는 공고는 404, 로그인하지 않으면 401', async () => {
      await expectError(await submit({ reviews: [review()] }, HOST, 999), 404, 'POST_NOT_FOUND');
      assert.equal((await submit({ reviews: [review()] }, null)).status, 401);
    });
  });
});
