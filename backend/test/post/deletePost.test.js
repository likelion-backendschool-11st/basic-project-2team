'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const AUTHOR = 7;
const OTHER = 9;

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { posts: new Map(), scraps: [], notices: [] };
  const alive = (p) => p && !p.deletedAt;
  return {
    state,
    async findPostAuthor(postId) {
      const p = state.posts.get(postId);
      return alive(p) ? { authorId: p.authorId, title: p.title } : null;
    },
    async softDeletePost(postId, deletedAt, notice) {
      const p = state.posts.get(postId);
      if (!alive(p)) return false;
      state.notices.push(notice);
      Object.assign(p, { status: 'DELETED', deletedAt });
      state.scraps = state.scraps.filter((s) => s.postId !== postId);
      return true;
    },
  };
}

describe('DELETE /api/posts/:postId', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ postRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => new Date('2026-11-14T00:00:00Z') });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.posts.clear();
    repo.state.posts.set(1, { authorId: AUTHOR, status: 'OPEN', deletedAt: null, title: '카멘 숙련팟' });
    repo.state.notices = [];
    repo.state.scraps = [{ postId: 1, memberId: OTHER }];
  });

  const del = (id, memberId = AUTHOR) =>
    fetch(`${baseUrl}/api/posts/${id}`, {
      method: 'DELETE',
      headers: memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {},
    });

  it('지울 때 신청자에게 보낼 POST_DELETED 알림 문구를 만든다 (긴 제목은 줄임표)', async () => {
    await del(1);
    assert.deepEqual(repo.state.notices, [{ type: 'POST_DELETED', message: "'카멘 숙련팟' 공고가 작성자에 의해 삭제되었습니다." }]);

    repo.state.posts.set(2, { authorId: AUTHOR, status: 'OPEN', deletedAt: null, title: '가'.repeat(60) });
    await del(2);
    assert.equal(repo.state.notices[1].message, `'${'가'.repeat(40)}…' 공고가 작성자에 의해 삭제되었습니다.`);
  });

  it('작성자가 지우면 204 이고 소프트 삭제되며 스크랩이 정리된다', async () => {
    const res = await del(1);
    assert.equal(res.status, 204);
    assert.deepEqual(repo.state.posts.get(1), { authorId: AUTHOR, status: 'DELETED', deletedAt: new Date('2026-11-14T00:00:00Z'), title: '카멘 숙련팟' });
    assert.equal(repo.state.scraps.length, 0);
  });

  it('작성자가 아니면 403 NOT_POST_AUTHOR 이고 삭제되지 않는다', async () => {
    const res = await del(1, OTHER);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'NOT_POST_AUTHOR');
    assert.equal(repo.state.posts.get(1).status, 'OPEN');
    assert.equal(repo.state.scraps.length, 1);
  });

  it('이미 삭제됐거나 없는 공고는 404 POST_NOT_FOUND', async () => {
    await del(1);
    for (const id of [1, 999]) {
      const res = await del(id);
      assert.equal(res.status, 404, String(id));
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND');
    }
  });

  it('postId 형식이 틀리면 404 POST_NOT_FOUND', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '99999999999999999999']) {
      const res = await del(id);
      assert.equal(res.status, 404, id);
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND', id);
    }
  });

  it('로그인하지 않으면 401', async () => {
    assert.equal((await del(1, null)).status, 401);
    assert.equal(repo.state.posts.get(1).status, 'OPEN');
  });
});
