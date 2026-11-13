'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const ME = 7;
const OTHER = 9;

/** DB 대신 메모리에 저장하는 가짜 repository (실제 repository 와 같이 모든 조회에 member_id 조건을 겁니다) */
function createFakeRepository() {
  const state = { rows: [] };
  const mine = (memberId) => state.rows.filter((r) => r.memberId === memberId);
  return {
    state,
    async findPage({ memberId, unreadOnly, limit, offset }) {
      const rows = mine(memberId).filter((r) => !unreadOnly || !r.isRead).sort((a, b) => b.id - a.id);
      return { rows: rows.slice(offset, offset + limit), totalCount: rows.length };
    },
    async countUnread(memberId) {
      return mine(memberId).filter((r) => !r.isRead).length;
    },
    async markRead(memberId, id) {
      const row = mine(memberId).find((r) => r.id === id);
      if (row) row.isRead = 1;
      return Boolean(row);
    },
    async markAllRead(memberId) {
      mine(memberId).forEach((r) => {
        r.isRead = 1;
      });
    },
  };
}

describe('notification inbox API', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ notificationRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    const row = (id, memberId, isRead, postId = 1) => ({
      id,
      memberId,
      type: 'APPLICATION_RESULT',
      message: `알림 ${id}`,
      postId,
      isRead,
      createdAt: new Date(`2026-11-13T0${id}:00:00Z`),
    });
    repo.state.rows = [row(1, ME, 1), row(2, ME, 0), row(3, ME, 0, null), row(4, OTHER, 0)];
  });

  const call = (method, path, memberId = ME) =>
    fetch(`${baseUrl}/api/notifications${path}`, {
      method,
      headers: memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {},
    });
  const json = async (res) => res.json();

  it('내 알림을 최신순으로 돌려주고 안 읽은 수를 함께 준다 (남의 알림은 나오지 않음)', async () => {
    const res = await call('GET', '');
    assert.equal(res.status, 200);
    const { data } = await json(res);
    assert.deepEqual(data.items.map((n) => n.id), [3, 2, 1]);
    assert.deepEqual(data.items[0], {
      id: 3,
      type: 'APPLICATION_RESULT',
      message: '알림 3',
      postId: null,
      read: false,
      createdAt: '2026-11-13T03:00:00.000Z',
    });
    assert.equal(data.items[2].read, true);
    assert.deepEqual([data.page, data.size, data.totalCount, data.totalPages, data.unreadCount], [1, 20, 3, 1, 2]);
  });

  it('unread=true 는 안 읽은 알림만, page·size 로 나눠 준다', async () => {
    const unread = (await json(await call('GET', '?unread=true'))).data;
    assert.deepEqual([unread.items.map((n) => n.id), unread.totalCount], [[3, 2], 2]);
    const paged = (await json(await call('GET', '?page=2&size=2'))).data;
    assert.deepEqual([paged.items.map((n) => n.id), paged.totalPages], [[1], 2]);
  });

  it('잘못된 page · size · unread 는 필드별 400', async () => {
    const res = await call('GET', '?page=0&size=51&unread=maybe');
    assert.equal(res.status, 400);
    assert.deepEqual((await json(res)).error.fields.map((f) => f.field), ['page', 'size', 'unread']);
  });

  it('안 읽은 알림 수만 가볍게 조회할 수 있다', async () => {
    assert.deepEqual((await json(await call('GET', '/unread-count'))).data, { count: 2 });
    assert.deepEqual((await json(await call('GET', '/unread-count', OTHER))).data, { count: 1 });
  });

  it('알림 하나를 읽음 처리하면 204, 이미 읽은 알림도 204', async () => {
    assert.equal((await call('PATCH', '/2/read')).status, 204);
    assert.equal((await call('PATCH', '/1/read')).status, 204);
    assert.deepEqual((await json(await call('GET', '/unread-count'))).data, { count: 1 });
  });

  it('남의 알림·없는 알림·형식이 틀린 id 는 404 NOTIFICATION_NOT_FOUND 이고 읽음 상태가 바뀌지 않는다', async () => {
    for (const id of ['4', '999', 'abc', '0', '-1']) {
      const res = await call('PATCH', `/${id}/read`);
      assert.equal(res.status, 404, id);
      assert.equal((await json(res)).error.code, 'NOTIFICATION_NOT_FOUND', id);
    }
    assert.equal(repo.state.rows.find((r) => r.id === 4).isRead, 0);
  });

  it('read-all 은 내 알림만 모두 읽음 처리한다', async () => {
    assert.equal((await call('PATCH', '/read-all')).status, 204);
    assert.deepEqual((await json(await call('GET', '/unread-count'))).data, { count: 0 });
    assert.deepEqual((await json(await call('GET', '/unread-count', OTHER))).data, { count: 1 });
  });

  it('로그인하지 않으면 모두 401', async () => {
    for (const [method, path] of [['GET', ''], ['GET', '/unread-count'], ['PATCH', '/1/read'], ['PATCH', '/read-all']]) {
      assert.equal((await call(method, path, null)).status, 401, `${method} ${path}`);
    }
  });
});
