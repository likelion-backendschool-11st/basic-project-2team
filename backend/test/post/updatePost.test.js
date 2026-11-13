'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const AUTHOR = 7;
const OTHER = 9;
const NOW = new Date('2026-11-14T00:00:00Z');
const FUTURE = '2026-11-20T12:00:00.000Z';

/** DB 대신 메모리에 저장하는 가짜 repository. updatePost 는 실제 repository 와 같은 규칙으로 판정합니다. */
function createFakeRepository() {
  const state = { posts: new Map(), notices: [] };
  return {
    state,
    async findGameByCode(code) {
      return code === 'lostark' ? { id: 1, categoryCode: 'mmorpg' } : null;
    },
    async findGameContent(gameId, code) {
      return gameId === 1 && code === 'kamen' ? { id: 10, type: 'raid', maxHeadcount: 8 } : null;
    },
    async findPostAuthor(postId) {
      const p = state.posts.get(postId);
      return p && p.status !== 'DELETED' ? { authorId: p.authorId, title: p.title, status: p.status, scheduleAt: p.scheduleAt } : null;
    },
    async updatePost({ postId, post, tags, notice }) {
      const p = state.posts.get(postId);
      state.notices.push(notice);
      if (!p || p.status === 'DELETED') return { result: 'NOT_FOUND' };
      if (p.status === 'COMPLETED') return { result: 'NOT_EDITABLE' };
      if (post.headcount < p.currentCount) return { result: 'HEADCOUNT_BELOW', currentCount: p.currentCount };
      const status = p.status === 'OPEN' && post.headcount === p.currentCount ? 'CLOSED' : p.status;
      Object.assign(p, post, { tags, status });
      return { result: 'OK' };
    },
  };
}

describe('PUT /api/posts/:postId', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ postRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.notices = [];
    repo.state.posts.clear();
    repo.state.posts.set(1, { authorId: AUTHOR, status: 'OPEN', currentCount: 3, headcount: 8, scheduleAt: new Date(FUTURE), title: '옛 제목' });
  });

  const body = (override = {}) => ({
    title: '수정한 제목',
    body: '수정한 본문',
    game: 'lostark',
    type: 'raid',
    detail: 'kamen',
    headcount: 6,
    style: 'casual',
    schedule: FUTURE,
    tags: ['#숙련'],
    ...override,
  });
  const put = (id, payload, memberId = AUTHOR) =>
    fetch(`${baseUrl}/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {}) },
      body: JSON.stringify(payload),
    });

  it('작성자가 수정하면 200 과 id 를 돌려주고 내용·태그가 바뀐다', async () => {
    const res = await put(1, body());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, data: { id: 1 } });
    const saved = repo.state.posts.get(1);
    assert.equal(saved.title, '수정한 제목');
    assert.equal(saved.headcount, 6);
    assert.deepEqual(saved.tags, ['숙련']);
    assert.equal(saved.status, 'OPEN');
  });

  it('신청자에게 보낼 POST_UPDATED 알림 문구를 넘긴다 (변경 여부 판단은 repository 가 한다)', async () => {
    await put(1, body({ title: '수정한 제목' }));
    assert.deepEqual(repo.state.notices, [{ type: 'POST_UPDATED', message: "'수정한 제목' 공고의 일정 또는 모집 내용이 수정되었습니다." }]);
  });

  it('인원을 확정 인원까지 줄이면 모집 마감이 되고, 그보다 적으면 400 이다', async () => {
    assert.equal((await put(1, body({ headcount: 3 }))).status, 200);
    assert.equal(repo.state.posts.get(1).status, 'CLOSED');

    repo.state.posts.get(1).status = 'OPEN';
    const res = await put(1, body({ headcount: 2 }));
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.fields[0].field, 'headcount');
    assert.equal(repo.state.posts.get(1).headcount, 3, '실패하면 바뀌지 않는다');
  });

  it('기존 일정을 그대로 보내면 이미 지난 일정이어도 수정할 수 있고, 새 과거 일정은 400 이다', async () => {
    const past = new Date('2026-11-10T00:00:00Z');
    repo.state.posts.get(1).scheduleAt = past;
    assert.equal((await put(1, body({ schedule: past.toISOString() }))).status, 200);
    const res = await put(1, body({ schedule: '2026-11-11T00:00:00Z' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.fields[0].field, 'schedule');
  });

  it('입력이 틀리면 400, 없는 게임은 404 다', async () => {
    assert.equal((await put(1, body({ title: '' }))).status, 400);
    const res = await put(1, body({ game: 'nope' }));
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'GAME_NOT_FOUND');
  });

  it('작성자가 아니면 403, 로그인하지 않으면 401 이고 내용은 그대로다', async () => {
    const other = await put(1, body(), OTHER);
    assert.equal(other.status, 403);
    assert.equal((await other.json()).error.code, 'NOT_POST_AUTHOR');
    assert.equal((await put(1, body(), null)).status, 401);
    assert.equal(repo.state.posts.get(1).title, '옛 제목');
  });

  it('완료된 공고는 409 POST_NOT_EDITABLE', async () => {
    repo.state.posts.get(1).status = 'COMPLETED';
    const res = await put(1, body());
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, 'POST_NOT_EDITABLE');
  });

  it('없거나 삭제된 공고, 형식이 틀린 id 는 404 POST_NOT_FOUND', async () => {
    repo.state.posts.get(1).status = 'DELETED';
    for (const id of [1, 999, 'abc', '0', '1.5']) {
      const res = await put(id, body());
      assert.equal(res.status, 404, String(id));
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND', String(id));
    }
  });
});
