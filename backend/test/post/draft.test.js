'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });

/** DB 대신 메모리에 저장하는 가짜 repository (회원당 1개, 덮어쓰기) */
function createFakeRepository() {
  const drafts = new Map();
  return {
    drafts,
    async saveDraft(memberId, payload) {
      drafts.set(memberId, { payload, savedAt: new Date('2026-11-14T03:00:00Z') });
      return drafts.get(memberId);
    },
    async findDraft(memberId) {
      return drafts.get(memberId) ?? null;
    },
  };
}

describe('post drafts API', () => {
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
  beforeEach(() => repo.drafts.clear());

  const call = (method, path, body, memberId = 7) =>
    fetch(`${baseUrl}/api/posts${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {}),
      },
      body: body && JSON.stringify(body),
    });

  it('저장하면 알려진 필드만 담고 savedAt 을 돌려준다', async () => {
    const res = await call('POST', '/drafts', { title: '제목', body: '', headcount: 5, tbd: true, hacker: 'x' });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, { draft: { title: '제목', body: '', headcount: 5, tbd: true }, savedAt: '2026-11-14T03:00:00.000Z' });
  });

  it('미완성(빈 객체)도 저장되고 불러올 수 있다', async () => {
    await call('POST', '/drafts', {});
    const { data } = await (await call('GET', '/drafts/latest')).json();
    assert.deepEqual(data.draft, {});
  });

  it('다시 저장하면 덮어쓰고, 회원마다 따로 저장된다', async () => {
    await call('POST', '/drafts', { title: '첫번째' });
    await call('POST', '/drafts', { title: '두번째' });
    await call('POST', '/drafts', { title: '남의 글' }, 9);
    assert.equal((await (await call('GET', '/drafts/latest')).json()).data.draft.title, '두번째');
    assert.equal((await (await call('GET', '/drafts/latest', undefined, 9)).json()).data.draft.title, '남의 글');
  });

  it('저장한 적이 없으면 data 는 null', async () => {
    const res = await call('GET', '/drafts/latest');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, data: null });
  });

  it('타입이 틀리거나 너무 긴 값은 필드별 400', async () => {
    const res = await call('POST', '/drafts', { title: 'a'.repeat(101), headcount: 99, tbd: 'yes', body: 1 });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'INVALID_INPUT');
    assert.deepEqual(error.fields.map((f) => f.field).sort(), ['body', 'headcount', 'tbd', 'title']);
  });

  it('본문이 객체가 아니면 400', async () => {
    assert.equal((await call('POST', '/drafts', [1, 2])).status, 400);
  });

  it('로그인하지 않으면 401', async () => {
    assert.equal((await call('POST', '/drafts', {}, null)).status, 401);
    assert.equal((await call('GET', '/drafts/latest', undefined, null)).status, 401);
  });
});
