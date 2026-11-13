'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

const rows = [
  { gameCode: 'lostark', gameName: '로스트아크', categoryCode: 'mmorpg', contentCode: 'kamen', contentName: '카멘', contentType: 'RAID', maxHeadcount: 8 },
  { gameCode: 'lostark', gameName: '로스트아크', categoryCode: 'mmorpg', contentCode: 'echidna', contentName: '에키드나', contentType: 'RAID', maxHeadcount: 8 },
  { gameCode: 'lol', gameName: '리그 오브 레전드', categoryCode: 'aos', contentCode: null, contentName: null, contentType: null },
];

describe('GET /api/games', () => {
  let server;
  before(async () => {
    const app = createApp({ gameRepository: { findAllWithContents: async () => rows }, corsOrigins: [], bcryptRounds: 4 });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
  });
  after(() => server.close());

  it('게임별로 상세 콘텐츠를 묶고 유형을 소문자로 내려준다', async () => {
    const res = await fetch(`http://localhost:${server.address().port}/api/games`);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, [
      {
        code: 'lostark',
        name: '로스트아크',
        categoryCode: 'mmorpg',
        contents: [
          { code: 'kamen', name: '카멘', type: 'raid', maxHeadcount: 8 },
          { code: 'echidna', name: '에키드나', type: 'raid', maxHeadcount: 8 },
        ],
      },
      { code: 'lol', name: '리그 오브 레전드', categoryCode: 'aos', contents: [] },
    ]);
  });
});
