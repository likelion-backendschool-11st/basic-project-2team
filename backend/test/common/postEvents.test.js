'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createPostEvents, POST_EVENT } = require('../../src/common/postEvents');

describe('postEvents 허브', () => {
  it('구독한 공고의 구독자에게만 신호를 보낸다', () => {
    const hub = createPostEvents();
    const got = { one: [], two: [] };
    hub.subscribe(1, (topic) => got.one.push(topic));
    hub.subscribe(2, (topic) => got.two.push(topic));
    hub.publish(1, POST_EVENT.post);
    hub.publish(1, POST_EVENT.comments);
    assert.deepEqual(got, { one: ['post', 'comments'], two: [] });
  });

  it('구독을 해제하면 더 받지 않고, 마지막 구독자가 빠지면 연결 수가 0 이 된다', () => {
    const hub = createPostEvents();
    const got = [];
    const stop = hub.subscribe(1, (topic) => got.push(topic));
    assert.equal(hub.connectionCount(), 1);
    stop();
    hub.publish(1, POST_EVENT.post);
    assert.deepEqual(got, []);
    assert.equal(hub.connectionCount(), 0);
  });

  it('한 구독자가 오류를 던져도 다른 구독자는 신호를 받고 publish 는 던지지 않는다', () => {
    const hub = createPostEvents();
    const got = [];
    hub.subscribe(1, () => {
      throw new Error('끊어진 연결');
    });
    hub.subscribe(1, (topic) => got.push(topic));
    assert.doesNotThrow(() => hub.publish(1, POST_EVENT.post));
    assert.deepEqual(got, ['post']);
  });

  it('publish 도중 구독을 해제해도 순회가 깨지지 않는다', () => {
    const hub = createPostEvents();
    const got = [];
    const stop = hub.subscribe(1, () => stop());
    hub.subscribe(1, (topic) => got.push(topic));
    hub.publish(1, POST_EVENT.post);
    assert.deepEqual(got, ['post']);
    assert.equal(hub.connectionCount(), 1);
  });
});
