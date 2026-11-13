'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const ME = 7;
const OTHER = 9;

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { posts: new Map(), scraps: new Set() };
  return {
    state,
    async findPostAuthor(postId) {
      const p = state.posts.get(postId);
      return p && p.status !== 'DELETED' ? { authorId: p.authorId, status: p.status, scheduleAt: null } : null;
    },
    async addScrap(memberId, postId) {
      state.scraps.add(`${memberId}:${postId}`);
    },
    async removeScrap(memberId, postId) {
      state.scraps.delete(`${memberId}:${postId}`);
    },
  };
}

describe('POST·DELETE /api/posts/:postId/scrap', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ postRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.posts.clear();
    repo.state.scraps.clear();
    repo.state.posts.set(1, { authorId: OTHER, status: 'OPEN' });
  });

  const call = (method, id, memberId = ME) =>
    fetch(`${baseUrl}/api/posts/${id}/scrap`, {
      method,
      headers: memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {},
    });

  it('스크랩하면 204 이고 내 스크랩만 저장된다. 다시 해도 204(멱등)', async () => {
    assert.equal((await call('POST', 1)).status, 204);
    assert.equal((await call('POST', 1)).status, 204);
    assert.deepEqual([...repo.state.scraps], [`${ME}:1`]);
  });

  it('취소하면 204 이고 내 스크랩만 지워진다. 스크랩하지 않았어도 204(멱등)', async () => {
    repo.state.scraps.add(`${ME}:1`);
    repo.state.scraps.add(`${OTHER}:1`);
    assert.equal((await call('DELETE', 1)).status, 204);
    assert.equal((await call('DELETE', 1)).status, 204);
    assert.deepEqual([...repo.state.scraps], [`${OTHER}:1`]);
  });

  it('없거나 삭제된 공고, 형식이 틀린 id 는 404 POST_NOT_FOUND 이고 저장되지 않는다', async () => {
    repo.state.posts.get(1).status = 'DELETED';
    for (const method of ['POST', 'DELETE']) {
      for (const id of [1, 999, 'abc', '0']) {
        const res = await call(method, id);
        assert.equal(res.status, 404, `${method} ${id}`);
        assert.equal((await res.json()).error.code, 'POST_NOT_FOUND');
      }
    }
    assert.equal(repo.state.scraps.size, 0);
  });

  it('로그인하지 않으면 401', async () => {
    assert.equal((await call('POST', 1, null)).status, 401);
    assert.equal((await call('DELETE', 1, null)).status, 401);
  });
});
