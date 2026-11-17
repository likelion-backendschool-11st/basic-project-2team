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
  const state = { rows: [], subs: [], nextSubId: 1 };
  const games = { lostark: { id: 1, name: '로스트아크', contents: { kamen: { id: 10, name: '카멘' } } }, lol: { id: 2, name: '리그 오브 레전드', contents: {} } };
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
    async remove(memberId, id) {
      const index = state.rows.findIndex((r) => r.id === id && r.memberId === memberId);
      if (index >= 0) state.rows.splice(index, 1);
      return index >= 0;
    },
    async findSubscriptions(memberId) {
      return state.subs
        .filter((s) => s.memberId === memberId)
        .map((s) => {
          const game = Object.values(games).find((g) => g.id === s.gameId);
          const content = Object.entries(game.contents).find(([, c]) => c.id === s.contentId);
          return {
            id: s.id,
            gameCode: Object.keys(games).find((k) => games[k] === game),
            gameName: game.name,
            detailCode: content?.[0] ?? null,
            detailName: content?.[1].name ?? null,
            enabled: s.enabled ? 1 : 0,
          };
        });
    },
    async findGameByCode(code) {
      return games[code] ? { id: games[code].id } : null;
    },
    async findGameContentByCode(gameId, code) {
      const game = Object.values(games).find((g) => g.id === gameId);
      return game?.contents[code] ? { id: game.contents[code].id } : null;
    },
    async countSubscriptions(memberId) {
      return state.subs.filter((s) => s.memberId === memberId).length;
    },
    async subscriptionExists(memberId, gameId, contentId) {
      return state.subs.some((s) => s.memberId === memberId && s.gameId === gameId && s.contentId === contentId);
    },
    async addSubscription(memberId, gameId, contentId) {
      const id = state.nextSubId++;
      state.subs.push({ id, memberId, gameId, contentId, enabled: true });
      return id;
    },
    async setSubscriptionEnabled(memberId, id, enabled) {
      const s = state.subs.find((x) => x.id === id && x.memberId === memberId);
      if (s) s.enabled = enabled;
      return Boolean(s);
    },
    async removeSubscription(memberId, id) {
      const i = state.subs.findIndex((x) => x.id === id && x.memberId === memberId);
      if (i >= 0) state.subs.splice(i, 1);
      return i >= 0;
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
    repo.state.subs = [];
    repo.state.nextSubId = 1;
    repo.state.rows = [row(1, ME, 1), row(2, ME, 0), row(3, ME, 0, null), row(4, OTHER, 0)];
  });

  const call = (method, path, memberId = ME, body) =>
    fetch(`${baseUrl}/api/notifications${path}`, {
      method,
      headers: { ...(memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
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
      invite: null,
    });
    assert.equal(data.items[2].read, true);
    assert.deepEqual([data.page, data.size, data.totalCount, data.totalPages, data.unreadCount], [1, 20, 3, 1, 2]);
  });

  it('파티 초대 알림에는 수락 여부(invite.joined)를 붙인다', async () => {
    repo.state.rows.push(
      { id: 5, memberId: ME, type: 'PARTY_INVITE', message: '초대 5', postId: 1, isRead: 0, createdAt: new Date('2026-11-13T05:00:00Z'), applicationStatus: null },
      { id: 6, memberId: ME, type: 'PARTY_INVITE', message: '초대 6', postId: 2, isRead: 1, createdAt: new Date('2026-11-13T06:00:00Z'), applicationStatus: 'ACCEPTED' },
      { id: 7, memberId: ME, type: 'PARTY_INVITE', message: '초대 7', postId: null, isRead: 0, createdAt: new Date('2026-11-13T07:00:00Z'), applicationStatus: null },
    );
    const { items } = (await json(await call('GET', ''))).data;
    const byId = Object.fromEntries(items.map((n) => [n.id, n.invite]));
    assert.deepEqual([byId[5], byId[6], byId[7], byId[2]], [{ joined: false }, { joined: true }, null, null]);
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

  it('알림을 삭제하면 204 이고 목록·안 읽은 수에서 빠진다', async () => {
    assert.equal((await call('DELETE', '/2')).status, 204);
    const { data } = await json(await call('GET', ''));
    assert.deepEqual(data.items.map((n) => n.id), [3, 1]);
    assert.equal(data.unreadCount, 1);
  });

  it('남의 알림·없는 알림·이미 지운 알림·형식이 틀린 id 삭제는 404 이고 아무것도 지워지지 않는다', async () => {
    const before = repo.state.rows.length;
    for (const id of ['4', '999', 'abc', '0', '-1']) {
      const res = await call('DELETE', `/${id}`);
      assert.equal(res.status, 404, id);
      assert.equal((await json(res)).error.code, 'NOTIFICATION_NOT_FOUND', id);
    }
    assert.equal(repo.state.rows.length, before);
  });

  it('read-all 은 내 알림만 모두 읽음 처리한다', async () => {
    assert.equal((await call('PATCH', '/read-all')).status, 204);
    assert.deepEqual((await json(await call('GET', '/unread-count'))).data, { count: 0 });
    assert.deepEqual((await json(await call('GET', '/unread-count', OTHER))).data, { count: 1 });
  });

  describe('관심 알림 설정', () => {
    it('게임·상세 분류를 등록하면 201, 목록에 이름과 함께 나온다 (내 설정만)', async () => {
      assert.equal((await call('POST', '/subscriptions', ME, { game: 'lostark' })).status, 201);
      const res = await call('POST', '/subscriptions', ME, { game: 'lostark', detail: 'kamen' });
      assert.deepEqual((await json(res)).data, { id: 2 });
      await call('POST', '/subscriptions', OTHER, { game: 'lol' });
      const { data } = await json(await call('GET', '/subscriptions'));
      assert.deepEqual(data, [
        { id: 1, game: 'lostark', gameName: '로스트아크', detail: null, detailName: null, enabled: true },
        { id: 2, game: 'lostark', gameName: '로스트아크', detail: 'kamen', detailName: '카멘', enabled: true },
      ]);
    });

    it('없는 게임·상세 분류는 404, 같은 설정은 409 SUBSCRIPTION_EXISTS, 20개 넘으면 409 SUBSCRIPTION_LIMIT', async () => {
      assert.equal((await json(await call('POST', '/subscriptions', ME, { game: 'nope' }))).error.code, 'GAME_NOT_FOUND');
      assert.equal((await json(await call('POST', '/subscriptions', ME, { game: 'lostark', detail: 'nope' }))).error.code, 'GAME_CONTENT_NOT_FOUND');
      await call('POST', '/subscriptions', ME, { game: 'lol' });
      const dup = await call('POST', '/subscriptions', ME, { game: 'lol' });
      assert.equal(dup.status, 409);
      assert.equal((await json(dup)).error.code, 'SUBSCRIPTION_EXISTS');
      repo.state.subs.push(...Array.from({ length: 19 }, (_, i) => ({ id: 100 + i, memberId: ME, gameId: 1, contentId: 1000 + i, enabled: true })));
      const over = await call('POST', '/subscriptions', ME, { game: 'lostark' });
      assert.equal(over.status, 409);
      assert.equal((await json(over)).error.code, 'SUBSCRIPTION_LIMIT');
    });

    it('잘못된 본문은 필드별 400', async () => {
      const res = await call('POST', '/subscriptions', ME, { game: 'A B', detail: 3 });
      assert.equal(res.status, 400);
      assert.deepEqual((await json(res)).error.fields.map((f) => f.field), ['game', 'detail']);
      const bad = await call('PATCH', '/subscriptions/1', ME, { enabled: 'yes' });
      assert.equal(bad.status, 400);
    });

    it('켜기·끄기와 삭제는 204, 남의 설정·없는 설정·형식이 틀린 id 는 404 SUBSCRIPTION_NOT_FOUND', async () => {
      await call('POST', '/subscriptions', ME, { game: 'lol' });
      assert.equal((await call('PATCH', '/subscriptions/1', ME, { enabled: false })).status, 204);
      assert.equal((await json(await call('GET', '/subscriptions'))).data[0].enabled, false);
      for (const [method, id, who] of [['PATCH', '1', OTHER], ['PATCH', '99', ME], ['DELETE', '1', OTHER], ['DELETE', 'abc', ME], ['DELETE', '0', ME]]) {
        const res = await call(method, `/subscriptions/${id}`, who, method === 'PATCH' ? { enabled: true } : undefined);
        assert.equal(res.status, 404, `${method} ${id}`);
        assert.equal((await json(res)).error.code, 'SUBSCRIPTION_NOT_FOUND');
      }
      assert.equal(repo.state.subs.length, 1);
      assert.equal((await call('DELETE', '/subscriptions/1')).status, 204);
      assert.deepEqual((await json(await call('GET', '/subscriptions'))).data, []);
    });
  });

  it('로그인하지 않으면 모두 401', async () => {
    for (const [method, path] of [['GET', ''], ['GET', '/unread-count'], ['PATCH', '/1/read'], ['PATCH', '/read-all'], ['DELETE', '/1'], ['GET', '/subscriptions'], ['POST', '/subscriptions'], ['PATCH', '/subscriptions/1'], ['DELETE', '/subscriptions/1']]) {
      assert.equal((await call(method, path, null)).status, 401, `${method} ${path}`);
    }
  });
});
