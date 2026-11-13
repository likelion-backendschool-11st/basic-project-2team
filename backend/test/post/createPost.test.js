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
const MEMBER_ID = 7;

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { posts: [], tags: [] };
  return {
    state,
    async findGameByCode(code) {
      return code === 'lostark' ? { id: 1, categoryCode: 'mmorpg' } : null;
    },
    async findGameContent(gameId, code) {
      if (gameId !== 1) return null;
      return { kamen: { id: 10, type: 'raid', maxHeadcount: 8 }, ranked: { id: 11, type: 'rank', maxHeadcount: 5 } }[code] ?? null;
    },
    async createPost({ post, tags }) {
      state.posts.push({ ...post, tags });
      return state.posts.length;
    },
  };
}

const futureIso = () => new Date(Date.now() + 86400000).toISOString();
const validBody = () => ({
  title: '[카멘 1-3관] 숙련 랏서폿 모십니다',
  body: '마크다운 **본문**',
  partyName: '카멘 숙련팟',
  game: 'lostark',
  type: 'raid',
  detail: 'kamen',
  headcount: 8,
  style: 'hard',
  schedule: futureIso(),
  scheduleTbd: false,
  voiceRequired: true,
  tags: ['숙련', '#디코필수', '숙련'],
});

describe('POST /api/posts', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();

  before(async () => {
    const app = createApp({ postRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.posts.length = 0;
  });

  const post = (body, loggedIn = true) =>
    fetch(`${baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(loggedIn ? { Authorization: `Bearer ${createTokenProvider(AUTH).createAccessToken(MEMBER_ID)}` } : {}),
      },
      body: JSON.stringify(body),
    });

  it('공고를 저장하고 201 과 id 를 돌려준다', async () => {
    const res = await post(validBody());
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { success: true, data: { id: 1 } });
    const saved = repo.state.posts[0];
    assert.equal(saved.authorId, MEMBER_ID);
    assert.equal(saved.categoryCode, 'mmorpg');
    assert.equal(saved.gameContentId, 10);
    assert.deepEqual(saved.tags, ['숙련', '디코필수']);
  });

  it('일정 미정이면 schedule 없이도 저장된다', async () => {
    const { schedule: _omit, ...rest } = validBody();
    const res = await post({ ...rest, scheduleTbd: true });
    assert.equal(res.status, 201);
    assert.equal(repo.state.posts[0].scheduleAt, null);
  });

  it('로그인하지 않으면 401', async () => {
    const res = await post(validBody(), false);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'UNAUTHORIZED');
  });

  it('잘못된 값은 필드별 오류와 함께 400', async () => {
    const res = await post({
      ...validBody(),
      title: 'a',
      body: ' ',
      headcount: 17,
      type: 'x',
      schedule: '2020-01-01T00:00:00+09:00',
      tags: ['1', '2', '3', '4', '5', '6'],
    });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'INVALID_INPUT');
    assert.deepEqual(error.fields.map((f) => f.field).sort(), ['body', 'headcount', 'schedule', 'tags', 'title', 'type']);
  });

  it('시간대 없는 일정은 400', async () => {
    const res = await post({ ...validBody(), schedule: '2099-01-01T10:00:00' });
    assert.equal(res.status, 400);
  });

  it('없는 게임이면 404', async () => {
    const res = await post({ ...validBody(), game: 'nope' });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'GAME_NOT_FOUND');
  });

  it('모집 유형과 맞지 않는 상세 분류면 400', async () => {
    const res = await post({ ...validBody(), detail: 'ranked' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.fields[0].field, 'detail');
  });

  it('상세 분류의 최대 인원을 넘으면 400', async () => {
    const res = await post({ ...validBody(), headcount: 9 });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.fields[0].field, 'headcount');
  });

  it('게임에 없는 상세 분류면 404', async () => {
    const res = await post({ ...validBody(), detail: 'nope' });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'GAME_CONTENT_NOT_FOUND');
  });
});
