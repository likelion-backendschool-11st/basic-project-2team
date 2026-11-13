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
const HOST_ID = 7;
const VIEWER_ID = 9;

const baseRow = () => ({
  id: 1,
  categoryCode: 'mmorpg',
  categoryName: 'MMORPG',
  gameCode: 'lostark',
  gameName: '로스트아크',
  detailCode: 'kamen',
  detailName: '카멘',
  detailType: 'RAID',
  partyType: 'raid',
  title: '[카멘 1-3관] 숙련 랏서폿 모십니다',
  body: '마크다운 **본문**',
  partyName: '카멘 숙련팟',
  playStyle: 'hard',
  requiredSpec: null,
  headcount: 8,
  currentCount: 7,
  scheduleAt: new Date('2026-11-15T12:00:00Z'),
  voiceRequired: 1,
  status: 'OPEN',
  viewCount: 0,
  commentCount: 3,
  scrapCount: 5,
  createdAt: new Date('2026-11-12T11:30:00Z'),
  updatedAt: new Date('2026-11-12T11:30:00Z'),
  hostId: HOST_ID,
  hostNickname: '빛나는오더',
  hostAvatarUrl: null,
  hostLevel: 52,
  hostMannerTemp: '99.8',
  hostReviewCount: 184,
  hostStatus: 'ACTIVE',
});

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { posts: new Map(), tags: new Map(), scraps: new Set(), applications: new Map() };
  const isAlive = (row) => row && row.status !== 'DELETED';
  return {
    state,
    async increaseViewCount(postId) {
      const row = state.posts.get(postId);
      if (!isAlive(row)) return false;
      row.viewCount += 1;
      return true;
    },
    async findPostDetail(postId) {
      const row = state.posts.get(postId);
      return isAlive(row) ? { ...row } : null;
    },
    async findTagNames(postId) {
      return state.tags.get(postId) ?? [];
    },
    async findViewerState(postId, memberId) {
      return {
        scrapped: state.scraps.has(`${postId}:${memberId}`),
        applicationStatus: state.applications.get(`${postId}:${memberId}`) ?? null,
      };
    },
  };
}

describe('GET /api/posts/:postId', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ boardRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.posts.clear();
    repo.state.tags.clear();
    repo.state.scraps.clear();
    repo.state.applications.clear();
    repo.state.posts.set(1, baseRow());
    repo.state.tags.set(1, ['숙련', '디코필수']);
  });

  const get = (postId, headers = {}) => fetch(`${baseUrl}/api/posts/${postId}`, { headers });
  const as = (memberId) => ({ Authorization: `Bearer ${tokens.createAccessToken(memberId)}` });

  it('비로그인: 공고 상세를 돌려주고 viewer 는 null 이다', async () => {
    const res = await get(1);
    assert.equal(res.status, 200);
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.deepEqual(data, {
      id: 1,
      category: 'mmorpg',
      categoryName: 'MMORPG',
      game: 'lostark',
      gameName: '로스트아크',
      detail: 'kamen',
      detailName: '카멘',
      detailType: 'RAID',
      type: 'raid',
      title: '[카멘 1-3관] 숙련 랏서폿 모십니다',
      body: '마크다운 **본문**',
      partyName: '카멘 숙련팟',
      style: 'hard',
      requiredSpec: null,
      headcount: 8,
      current: 7,
      schedule: '2026-11-15T12:00:00.000Z',
      scheduleTbd: false,
      voiceRequired: true,
      status: 'OPEN',
      views: 1,
      commentCount: 3,
      scrapCount: 5,
      tags: ['숙련', '디코필수'],
      host: { id: HOST_ID, nickname: '빛나는오더', avatarUrl: null, level: 52, mannerTemp: 99.8, reviewCount: 184 },
      viewer: null,
      createdAt: '2026-11-12T11:30:00.000Z',
      updatedAt: '2026-11-12T11:30:00.000Z',
    });
  });

  it('조회할 때마다 조회수가 1 씩 오른다', async () => {
    await get(1);
    const { data } = await (await get(1)).json();
    assert.equal(data.views, 2);
  });

  it('작성자가 보면 viewer.isOwner 가 true 다', async () => {
    const { data } = await (await get(1, as(HOST_ID))).json();
    assert.deepEqual(data.viewer, { isOwner: true, scrapped: false, applicationStatus: null });
  });

  it('로그인한 다른 회원은 스크랩 여부와 신청 상태를 함께 받는다', async () => {
    repo.state.scraps.add(`1:${VIEWER_ID}`);
    repo.state.applications.set(`1:${VIEWER_ID}`, 'PENDING');
    const { data } = await (await get(1, as(VIEWER_ID))).json();
    assert.deepEqual(data.viewer, { isOwner: false, scrapped: true, applicationStatus: 'PENDING' });
  });

  it('일정 미정 공고는 schedule null, scheduleTbd true', async () => {
    repo.state.posts.get(1).scheduleAt = null;
    const { data } = await (await get(1)).json();
    assert.equal(data.schedule, null);
    assert.equal(data.scheduleTbd, true);
  });

  it('탈퇴한 작성자는 닉네임을 가린다', async () => {
    Object.assign(repo.state.posts.get(1), { hostStatus: 'WITHDRAWN', hostNickname: null, hostAvatarUrl: 'x.png' });
    const { data } = await (await get(1)).json();
    assert.equal(data.host.nickname, '탈퇴한 회원');
    assert.equal(data.host.avatarUrl, null);
  });

  it('없는 공고는 404 POST_NOT_FOUND', async () => {
    const res = await get(999);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), {
      success: false,
      error: { code: 'POST_NOT_FOUND', message: '존재하지 않는 공고입니다.' },
    });
  });

  it('삭제된 공고는 404 이고 조회수도 오르지 않는다', async () => {
    repo.state.posts.get(1).status = 'DELETED';
    const res = await get(1);
    assert.equal(res.status, 404);
    assert.equal(repo.state.posts.get(1).viewCount, 0);
  });

  it('postId 형식이 틀리면 404 POST_NOT_FOUND', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '99999999999999999999']) {
      const res = await get(id);
      assert.equal(res.status, 404, id);
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND', id);
    }
  });

  it('토큰이 잘못되면 401 UNAUTHORIZED', async () => {
    const res = await get(1, { Authorization: 'Bearer invalid' });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
  });
});
