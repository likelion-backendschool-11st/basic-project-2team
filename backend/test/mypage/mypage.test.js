'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const ME = 1;
const OTHER = 2;
const WITHDRAWN = 3;

const memberRow = (overrides) => ({
  id: ME,
  nickname: '빛나는힐러',
  avatarUrl: null,
  bio: '멘탈 강한 힐러입니다.',
  ageRange: '20대',
  ageRangePublic: 0,
  level: 48,
  mannerTemp: '98.4',
  reviewCount: 4,
  status: 'ACTIVE',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  ...overrides,
});

const postColumns = (overrides) => ({
  postId: 10,
  categoryCode: 'mmorpg',
  gameCode: 'lostark',
  gameName: '로스트아크',
  partyType: 'raid',
  title: '[카멘] 숙련 서폿 구해요',
  headcount: 8,
  currentCount: 8,
  scheduleAt: new Date('2026-11-15T12:00:00Z'),
  postStatus: 'COMPLETED',
  ...overrides,
});

/** DB 대신 메모리에 저장하는 가짜 repository. 페이지 조회는 넘겨받은 limit/offset 으로 배열을 자릅니다. */
function createFakeRepository() {
  const state = {
    members: new Map(),
    games: new Map(),
    stats: new Map(),
    tags: new Map(),
    posts: [],
    applications: [],
    comments: [],
    favorites: new Set(),
    calls: [],
  };
  const slice = (rows, { limit, offset }) => ({ rows: rows.slice(offset, offset + limit), totalCount: rows.length });
  const emptyStats = { postCount: 0, completedPartyCount: 0, ratingCount: 0, recentAverageRating: null };
  return {
    state,
    async findMember(memberId) {
      const row = state.members.get(memberId);
      return row ? { ...row } : null;
    },
    async findGameProfiles(memberId) {
      return state.games.get(memberId) ?? [];
    },
    async findProfileStats(memberId, recentRatingLimit) {
      state.calls.push({ name: 'findProfileStats', recentRatingLimit });
      return state.stats.get(memberId) ?? emptyStats;
    },
    async findTopReviewTags(memberId, limit) {
      return (state.tags.get(memberId) ?? []).slice(0, limit);
    },
    async findMyPostPage(filter) {
      state.calls.push({ name: 'findMyPostPage', ...filter });
      return slice(state.posts, filter);
    },
    async findMyApplicationPage(filter) {
      state.calls.push({ name: 'findMyApplicationPage', ...filter });
      const rows = filter.status ? state.applications.filter((row) => row.status === filter.status) : state.applications;
      return slice(rows, filter);
    },
    async findMyCommentPage(filter) {
      return slice(state.comments, filter);
    },
    async findFavorites(memberId) {
      return [...state.favorites]
        .filter((key) => key.startsWith(`${memberId}:`))
        .map((key) => state.members.get(Number(key.split(':')[1])))
        .filter((row) => row && row.status !== 'WITHDRAWN')
        .map((row) => ({
          id: row.id,
          nickname: row.nickname,
          avatarUrl: row.avatarUrl,
          level: row.level,
          mannerTemp: row.mannerTemp,
          mainGameCode: 'valorant',
          mainGameName: '발로란트',
          mainPlayStyle: 'casual',
          favoritedAt: new Date('2026-11-01T00:00:00Z'),
        }));
    },
    async isFavorite(memberId, targetMemberId) {
      return state.favorites.has(`${memberId}:${targetMemberId}`);
    },
    async addFavorite(memberId, targetMemberId) {
      state.favorites.add(`${memberId}:${targetMemberId}`);
    },
    async removeFavorite(memberId, targetMemberId) {
      state.favorites.delete(`${memberId}:${targetMemberId}`);
    },
  };
}

describe('마이페이지 API (/api/members)', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ mypageRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => new Date('2026-11-16T00:00:00Z') });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    const { state } = repo;
    state.members.clear();
    state.games.clear();
    state.stats.clear();
    state.tags.clear();
    state.posts = [];
    state.applications = [];
    state.comments = [];
    state.favorites.clear();
    state.calls = [];

    state.members.set(ME, memberRow());
    state.members.set(OTHER, memberRow({ id: OTHER, nickname: '철수', bio: null, ageRangePublic: 1, level: 52, mannerTemp: '36.5', reviewCount: 0 }));
    state.members.set(WITHDRAWN, memberRow({ id: WITHDRAWN, nickname: null, status: 'WITHDRAWN' }));
    state.games.set(ME, [
      { code: 'lostark', name: '로스트아크', isMain: 1, playStyle: 'casual', playTimeSlot: '평일 21-24' },
      { code: 'lol', name: '리그 오브 레전드', isMain: 0, playStyle: null, playTimeSlot: null },
    ]);
    state.stats.set(ME, { postCount: 24, completedPartyCount: 156, ratingCount: 4, recentAverageRating: 4.6667 });
    state.tags.set(ME, [
      { code: 'kind', label: '#친절함', count: 4 },
      { code: 'on-time', label: '#시간엄수', count: 3 },
      { code: 'briefing', label: '#브리핑장인', count: 1 },
      { code: 'carry', label: '#캐리', count: 1 },
    ]);
  });

  const as = (memberId) => ({ Authorization: `Bearer ${tokens.createAccessToken(memberId)}` });
  const request = (method, path, headers = {}) => fetch(`${baseUrl}/api/members${path}`, { method, headers });
  const get = (path, headers) => request('GET', path, headers);

  describe('GET /me/summary', () => {
    it('내 프로필 요약을 돌려준다 (비공개 나이대 포함, 태그 Top3 와 비율)', async () => {
      const res = await get('/me/summary', as(ME));
      assert.equal(res.status, 200);
      const { success, data } = await res.json();
      assert.equal(success, true);
      assert.deepEqual(data, {
        id: ME,
        nickname: '빛나는힐러',
        avatarUrl: null,
        bio: '멘탈 강한 힐러입니다.',
        ageRange: '20대',
        level: 48,
        mannerTemp: 98.4,
        reviewCount: 4,
        averageRating: 4.7,
        postCount: 24,
        completedPartyCount: 156,
        games: [
          { code: 'lostark', name: '로스트아크', isMain: true, playStyle: 'casual', playTimeSlot: '평일 21-24' },
          { code: 'lol', name: '리그 오브 레전드', isMain: false, playStyle: null, playTimeSlot: null },
        ],
        topTags: [
          { rank: 1, code: 'kind', label: '#친절함', count: 4, percent: 100 },
          { rank: 2, code: 'on-time', label: '#시간엄수', count: 3, percent: 75 },
          { rank: 3, code: 'briefing', label: '#브리핑장인', count: 1, percent: 25 },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
        ageRangePublic: false,
      });
      assert.deepEqual(repo.state.calls, [{ name: 'findProfileStats', recentRatingLimit: 30 }]);
    });

    it('평가가 없으면 averageRating 은 null, topTags 는 빈 배열이다', async () => {
      const { data } = await (await get('/me/summary', as(OTHER))).json();
      assert.equal(data.averageRating, null);
      assert.deepEqual(data.topTags, []);
      assert.deepEqual(data.games, []);
    });

    it('토큰이 없으면 401 UNAUTHORIZED', async () => {
      const res = await get('/me/summary');
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
    });

    it('탈퇴한 회원의 토큰이면 401 UNAUTHORIZED', async () => {
      const res = await get('/me/summary', as(WITHDRAWN));
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
    });
  });

  describe('GET /:memberId', () => {
    it('비로그인: 공개 프로필을 돌려주고 viewer 는 null 이다 (비공개 나이대 숨김)', async () => {
      const res = await get(`/${ME}`);
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.nickname, '빛나는힐러');
      assert.equal(data.ageRange, null);
      assert.equal(data.ageRangePublic, undefined);
      assert.equal(data.viewer, null);
      assert.equal(data.topTags.length, 3);
    });

    it('공개 설정된 나이대는 다른 사람에게도 보인다', async () => {
      const { data } = await (await get(`/${OTHER}`)).json();
      assert.equal(data.ageRange, '20대');
    });

    it('로그인: 즐겨찾기 여부를 viewer 에 담는다', async () => {
      repo.state.favorites.add(`${ME}:${OTHER}`);
      const { data } = await (await get(`/${OTHER}`, as(ME))).json();
      assert.deepEqual(data.viewer, { isMe: false, favorited: true });
    });

    it('본인 프로필이면 viewer.isMe 가 true 이고 비공개 나이대도 보인다', async () => {
      const { data } = await (await get(`/${ME}`, as(ME))).json();
      assert.deepEqual(data.viewer, { isMe: true, favorited: false });
      assert.equal(data.ageRange, '20대');
    });

    it('없는 회원, 탈퇴 회원, 잘못된 id 는 404 MEMBER_NOT_FOUND', async () => {
      for (const id of ['999', String(WITHDRAWN), 'abc', '0']) {
        const res = await get(`/${id}`);
        assert.equal(res.status, 404, id);
        assert.equal((await res.json()).error.code, 'MEMBER_NOT_FOUND');
      }
    });

    it('Authorization 헤더가 잘못되면 401', async () => {
      const res = await get(`/${ME}`, { Authorization: 'Bearer broken' });
      assert.equal(res.status, 401);
    });
  });

  describe('GET /me/posts', () => {
    beforeEach(() => {
      repo.state.posts = Array.from({ length: 12 }, (_, index) => ({
        ...postColumns({ postId: 100 - index, scheduleAt: index === 0 ? null : new Date('2026-11-15T12:00:00Z') }),
        viewCount: 5,
        commentCount: 2,
        createdAt: new Date('2026-11-10T00:00:00Z'),
        reviewTargetCount: 7,
        reviewedCount: 2,
      }));
    });

    it('기본 size 10 으로 첫 페이지를 돌려준다', async () => {
      const res = await get('/me/posts', as(ME));
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.items.length, 10);
      assert.deepEqual(
        { page: data.page, size: data.size, totalCount: data.totalCount, totalPages: data.totalPages },
        { page: 1, size: 10, totalCount: 12, totalPages: 2 },
      );
      assert.deepEqual(data.items[0], {
        id: 100,
        category: 'mmorpg',
        game: 'lostark',
        gameName: '로스트아크',
        type: 'raid',
        title: '[카멘] 숙련 서폿 구해요',
        current: 8,
        max: 8,
        schedule: null,
        scheduleTbd: true,
        status: 'COMPLETED',
        views: 5,
        commentCount: 2,
        createdAt: '2026-11-10T00:00:00.000Z',
        canComplete: false,
        review: { targetCount: 7, reviewedCount: 2 },
      });
      assert.deepEqual(repo.state.calls.at(-1), { name: 'findMyPostPage', memberId: ME, limit: 10, offset: 0 });
    });

    it('완료 전 공고는 승인된 파티원이 있어야 canComplete, 별점 평가(review)는 활동 완료 후에만', async () => {
      repo.state.posts = [
        { ...repo.state.posts[0], postId: 1, postStatus: 'OPEN', reviewTargetCount: 3, reviewedCount: 0 },
        { ...repo.state.posts[0], postId: 2, postStatus: 'CLOSED', reviewTargetCount: 0, reviewedCount: 0 },
        { ...repo.state.posts[0], postId: 3, postStatus: 'COMPLETED', reviewTargetCount: 3, reviewedCount: 3 },
      ];
      const { data } = await (await get('/me/posts', as(ME))).json();
      assert.deepEqual(
        data.items.map(({ id, canComplete, review }) => ({ id, canComplete, review })),
        [
          { id: 1, canComplete: true, review: null },
          { id: 2, canComplete: false, review: null },
          { id: 3, canComplete: false, review: { targetCount: 3, reviewedCount: 3 } },
        ],
      );
    });

    it('출발 시간 전이면 canComplete 가 false 다 (일정 미정은 시간 조건 없음)', async () => {
      const base = { ...repo.state.posts[0], postStatus: 'OPEN', reviewTargetCount: 3, reviewedCount: 0 };
      repo.state.posts = [
        { ...base, postId: 1, scheduleAt: new Date('2026-11-17T00:00:00Z') },
        { ...base, postId: 2, scheduleAt: new Date('2026-11-15T00:00:00Z') },
        { ...base, postId: 3, scheduleAt: null },
      ];
      const { data } = await (await get('/me/posts', as(ME))).json();
      assert.deepEqual(data.items.map((item) => item.canComplete), [false, true, true]);
    });

    it('page·size 로 offset 을 계산한다', async () => {
      const { data } = await (await get('/me/posts?page=2&size=5', as(ME))).json();
      assert.equal(data.items.length, 5);
      assert.deepEqual(repo.state.calls.at(-1), { name: 'findMyPostPage', memberId: ME, limit: 5, offset: 5 });
    });

    it('page·size 가 올바르지 않으면 400 INVALID_INPUT (필드별)', async () => {
      const res = await get('/me/posts?page=0&size=51', as(ME));
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.deepEqual(
        error.fields.map((field) => field.field),
        ['page', 'size'],
      );
    });

    it('토큰이 없으면 401', async () => {
      assert.equal((await get('/me/posts')).status, 401);
    });
  });

  describe('GET /me/applications', () => {
    beforeEach(() => {
      repo.state.applications = [
        { id: 1, status: 'PENDING', role: '서포터', appliedAt: new Date('2026-11-12T00:00:00Z'), ...postColumns({ postStatus: 'OPEN' }), hostNickname: '빛나는오더', hostStatus: 'ACTIVE', reviewTargetCount: 1, reviewedCount: 0 },
        { id: 2, status: 'ACCEPTED', role: null, appliedAt: new Date('2026-11-11T00:00:00Z'), ...postColumns({ postId: 11 }), hostNickname: null, hostStatus: 'WITHDRAWN', reviewTargetCount: 6, reviewedCount: 1 },
      ];
    });

    it('신청 상태와 공고 요약을 함께 돌려준다 (탈퇴한 파티장은 "탈퇴한 회원")', async () => {
      const { data } = await (await get('/me/applications', as(ME))).json();
      assert.equal(data.totalCount, 2);
      assert.deepEqual(data.items[0], {
        id: 1,
        status: 'PENDING',
        role: '서포터',
        appliedAt: '2026-11-12T00:00:00.000Z',
        post: {
          id: 10,
          category: 'mmorpg',
          game: 'lostark',
          gameName: '로스트아크',
          type: 'raid',
          title: '[카멘] 숙련 서폿 구해요',
          current: 8,
          max: 8,
          schedule: '2026-11-15T12:00:00.000Z',
          scheduleTbd: false,
          status: 'OPEN',
          host: '빛나는오더',
        },
        review: null,
      });
      assert.equal(data.items[1].post.host, '탈퇴한 회원');
    });

    it('승인된 신청이고 공고가 활동 완료면 별점 평가 진행 상황(review)을 준다', async () => {
      repo.state.applications.push({ ...repo.state.applications[1], id: 3, status: 'REJECTED' });
      const { data } = await (await get('/me/applications', as(ME))).json();
      assert.deepEqual(
        data.items.map(({ id, review }) => ({ id, review })),
        [
          { id: 1, review: null },
          { id: 2, review: { targetCount: 6, reviewedCount: 1 } },
          { id: 3, review: null },
        ],
      );
    });

    it('status 로 거른다', async () => {
      const { data } = await (await get('/me/applications?status=ACCEPTED', as(ME))).json();
      assert.deepEqual(
        data.items.map((item) => item.id),
        [2],
      );
      assert.equal(repo.state.calls.at(-1).status, 'ACCEPTED');
    });

    it('status 가 올바르지 않으면 400 INVALID_INPUT', async () => {
      const res = await get('/me/applications?status=pending', as(ME));
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.fields[0].field, 'status');
    });
  });

  describe('GET /me/comments', () => {
    it('내 댓글을 공고 제목과 함께 돌려준다', async () => {
      repo.state.comments = [
        {
          id: 5,
          content: '서폿 자리 남았으면 신청합니다!',
          isSecret: 1,
          status: 'VISIBLE',
          parentId: 3,
          createdAt: new Date('2026-11-11T00:00:00Z'),
          postId: 10,
          postTitle: '[에키드나] 바로 출발',
          gameCode: 'lostark',
          gameName: '로스트아크',
        },
      ];
      const { data } = await (await get('/me/comments', as(ME))).json();
      assert.deepEqual(data, {
        items: [
          {
            id: 5,
            postId: 10,
            postTitle: '[에키드나] 바로 출발',
            game: 'lostark',
            gameName: '로스트아크',
            content: '서폿 자리 남았으면 신청합니다!',
            secret: true,
            reply: true,
            status: 'VISIBLE',
            createdAt: '2026-11-11T00:00:00.000Z',
          },
        ],
        page: 1,
        size: 10,
        totalCount: 1,
        totalPages: 1,
      });
    });

    it('댓글이 없으면 빈 목록과 totalPages 0', async () => {
      const { data } = await (await get('/me/comments', as(ME))).json();
      assert.deepEqual(data, { items: [], page: 1, size: 10, totalCount: 0, totalPages: 0 });
    });
  });

  describe('즐겨찾기 /me/favorites', () => {
    it('추가하면 204, 목록에 나타나고 다시 추가해도 204', async () => {
      assert.equal((await request('POST', `/me/favorites/${OTHER}`, as(ME))).status, 204);
      assert.equal((await request('POST', `/me/favorites/${OTHER}`, as(ME))).status, 204);

      const { data } = await (await get('/me/favorites', as(ME))).json();
      assert.deepEqual(data, [
        {
          id: OTHER,
          nickname: '철수',
          avatarUrl: null,
          level: 52,
          mannerTemp: 36.5,
          mainGame: { code: 'valorant', name: '발로란트' },
          playStyle: 'casual',
          favoritedAt: '2026-11-01T00:00:00.000Z',
        },
      ]);
    });

    it('해제하면 204, 즐겨찾기하지 않은 유저를 해제해도 204', async () => {
      repo.state.favorites.add(`${ME}:${OTHER}`);
      assert.equal((await request('DELETE', `/me/favorites/${OTHER}`, as(ME))).status, 204);
      assert.equal((await request('DELETE', `/me/favorites/${OTHER}`, as(ME))).status, 204);
      assert.equal(repo.state.favorites.size, 0);
    });

    it('자기 자신은 400 CANNOT_FAVORITE_SELF', async () => {
      const res = await request('POST', `/me/favorites/${ME}`, as(ME));
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'CANNOT_FAVORITE_SELF');
    });

    it('없는 회원·탈퇴 회원·잘못된 id 는 404 MEMBER_NOT_FOUND', async () => {
      for (const id of ['999', String(WITHDRAWN), 'abc']) {
        const res = await request('POST', `/me/favorites/${id}`, as(ME));
        assert.equal(res.status, 404, id);
        assert.equal((await res.json()).error.code, 'MEMBER_NOT_FOUND');
      }
      assert.equal(repo.state.favorites.size, 0);
    });

    it('토큰이 없으면 401', async () => {
      assert.equal((await get('/me/favorites')).status, 401);
      assert.equal((await request('POST', `/me/favorites/${OTHER}`)).status, 401);
      assert.equal((await request('DELETE', `/me/favorites/${OTHER}`)).status, 401);
    });
  });
});
