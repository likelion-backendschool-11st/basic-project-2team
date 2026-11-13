'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

describe('GET /api/categories', () => {
  let server;
  before(async () => {
    const categories = [
      { code: 'mmorpg', name: 'MMORPG', postCount: 12 },
      { code: 'etc', name: '기타', postCount: 0 },
    ];
    const app = createApp({ categoryRepository: { findAllWithPostCount: async () => categories }, corsOrigins: [], bcryptRounds: 4 });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
  });
  after(() => server.close());

  it('로그인 없이 카테고리와 공고 수를 돌려준다', async () => {
    const res = await fetch(`http://localhost:${server.address().port}/api/categories`);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, [
      { code: 'mmorpg', name: 'MMORPG', postCount: 12 },
      { code: 'etc', name: '기타', postCount: 0 },
    ]);
  });
});
