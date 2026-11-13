'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createPostEvents, POST_EVENT } = require('../../src/common/postEvents');

/** 존재하는 공고(1)와 삭제된 공고(2)만 아는 가짜 repository */
const repo = {
  async findPostDetail(postId) {
    return postId === 1 ? { id: 1 } : null;
  },
};

/** 스트림에서 조건을 만족하는 텍스트가 올 때까지 읽습니다. */
async function readUntil(reader, predicate, ms = 2000) {
  const decoder = new TextDecoder();
  let text = '';
  const deadline = Date.now() + ms;
  while (!predicate(text)) {
    if (Date.now() > deadline) throw new Error(`시간 초과, 받은 내용: ${JSON.stringify(text)}`);
    const { value, done } = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r({ timeout: true }), 100))]).then((r) => (r.timeout ? { value: undefined } : r));
    if (done) break;
    if (value) text += decoder.decode(value);
  }
  return text;
}

describe('GET /api/posts/:postId/events (SSE)', () => {
  let server;
  let baseUrl;
  const events = createPostEvents();

  before(async () => {
    const app = createApp({ boardRepository: repo, postEvents: events, corsOrigins: [], bcryptRounds: 4 });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.closeAllConnections?.() ?? server.close());

  it('text/event-stream 으로 연결되고, 발행된 신호가 event 이름과 함께 온다 (비로그인 허용)', async () => {
    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/api/posts/1/events`, { signal: controller.signal });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/event-stream/);
    assert.equal(res.headers.get('x-accel-buffering'), 'no');
    assert.equal(events.connectionCount(), 1);

    const reader = res.body.getReader();
    events.publish(1, POST_EVENT.post);
    events.publish(1, POST_EVENT.comments);
    events.publish(2, POST_EVENT.post); // 다른 공고의 신호는 오지 않는다
    const text = await readUntil(reader, (t) => t.includes('event: comments'));
    assert.match(text, /retry: 3000/);
    assert.match(text, /event: post\ndata: \{\}\n\n/);
    assert.match(text, /event: comments\ndata: \{\}\n\n/);
    controller.abort();
  });

  it('연결이 끊기면 구독이 정리된다', async () => {
    const controller = new AbortController();
    await fetch(`${baseUrl}/api/posts/1/events`, { signal: controller.signal });
    controller.abort();
    const deadline = Date.now() + 2000;
    while (events.connectionCount() > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
    assert.equal(events.connectionCount(), 0);
  });

  it('없거나 삭제된 공고, 잘못된 postId 는 404 POST_NOT_FOUND 이고 구독하지 않는다', async () => {
    for (const id of ['2', '999', 'abc', '0']) {
      const res = await fetch(`${baseUrl}/api/posts/${id}/events`);
      assert.equal(res.status, 404, id);
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND', id);
    }
    assert.equal(events.connectionCount(), 0);
  });
});
