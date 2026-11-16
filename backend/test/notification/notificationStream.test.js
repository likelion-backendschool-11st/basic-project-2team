'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');
const { createMemberEvents, MEMBER_EVENT } = require('../../src/common/memberEvents');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const ME = 7;
const OTHER = 9;

/** 스트림에서 조건을 만족하는 텍스트가 올 때까지 읽습니다. */
async function readUntil(reader, predicate, ms = 2000) {
  const decoder = new TextDecoder();
  let text = '';
  const deadline = Date.now() + ms;
  while (!predicate(text)) {
    if (Date.now() > deadline) throw new Error(`시간 초과, 받은 내용: ${JSON.stringify(text)}`);
    const { value, done } = await reader.read();
    if (done) break;
    if (value) text += decoder.decode(value);
  }
  return text;
}

describe('GET /api/notifications/stream (SSE)', () => {
  let server;
  let baseUrl;
  const events = createMemberEvents();
  const tokens = createTokenProvider(AUTH);
  const open = (memberId, signal) =>
    fetch(`${baseUrl}/api/notifications/stream`, { signal, headers: memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {} });

  before(async () => {
    const app = createApp({ notificationRepository: {}, memberEvents: events, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.closeAllConnections?.() ?? server.close());

  it('로그인 없이 연결하면 401', async () => {
    assert.equal((await open(null)).status, 401);
    assert.equal(events.connectionCount(), 0);
  });

  it('내 알림 신호만 event: notifications 로 온다', async () => {
    const controller = new AbortController();
    const res = await open(ME, controller.signal);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/event-stream/);
    assert.equal(events.connectionCount(), 1);

    const reader = res.body.getReader();
    await readUntil(reader, (t) => t.includes(': connected'));
    events.publish(OTHER, MEMBER_EVENT.notifications); // 남의 신호는 오지 않는다
    events.publish(ME, MEMBER_EVENT.notifications);
    const text = await readUntil(reader, (t) => t.includes('event: notifications'));
    assert.equal(text.match(/event: notifications/g).length, 1);
    controller.abort();
  });

  it('연결이 끊기면 구독이 정리된다', async () => {
    const controller = new AbortController();
    await open(ME, controller.signal);
    controller.abort();
    const deadline = Date.now() + 2000;
    while (events.connectionCount() > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
    assert.equal(events.connectionCount(), 0);
  });
});
