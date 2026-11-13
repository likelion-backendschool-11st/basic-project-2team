'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { rows: [], topTags: new Map(), limits: [] };
  return {
    state,
    async findMannerRanking(limit) {
      state.limits.push(limit);
      return state.rows.slice(0, limit);
    },
    async findTopTagByMember(memberIds) {
      return new Map(memberIds.filter((id) => state.topTags.has(id)).map((id) => [id, state.topTags.get(id)]));
    },
  };
}

describe('GET /api/rankings/manner', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();

  before(async () => {
    const app = createApp({ rankingRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.rows = [
      { id: 5, nickname: '갓공대장', avatarUrl: null, level: 30, mannerTemp: '99.0', reviewCount: 142, mainGameCode: 'lostark', mainGameName: '로스트아크' },
      { id: 8, nickname: '아침햇살', avatarUrl: 'https://img/8.png', level: 12, mannerTemp: '96.4', reviewCount: 118, mainGameCode: null, mainGameName: null },
    ];
    repo.state.topTags = new Map([[5, { code: 'order', label: '#오더장인' }]]);
    repo.state.limits = [];
  });

  const get = (query = '') => fetch(`${baseUrl}/api/rankings/manner${query}`);

  it('순위 · 매너 온도 · 대표 게임 · 대표 태그를 돌려준다 (로그인 불필요, 기본 10명)', async () => {
    const res = await get();
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, [
      { rank: 1, id: 5, nickname: '갓공대장', avatarUrl: null, level: 30, mannerTemp: 99, reviewCount: 142, mainGame: { code: 'lostark', name: '로스트아크' }, topTag: { code: 'order', label: '#오더장인' } },
      { rank: 2, id: 8, nickname: '아침햇살', avatarUrl: 'https://img/8.png', level: 12, mannerTemp: 96.4, reviewCount: 118, mainGame: null, topTag: null },
    ]);
    assert.deepEqual(repo.state.limits, [10]);
  });

  it('limit 로 개수를 정한다', async () => {
    const res = await get('?limit=1');
    assert.equal((await res.json()).data.length, 1);
    assert.deepEqual(repo.state.limits, [1]);
  });

  it('limit 가 1~50 정수가 아니면 400 INVALID_INPUT', async () => {
    for (const limit of ['0', '51', 'abc', '1.5', '-1']) {
      const res = await get(`?limit=${limit}`);
      assert.equal(res.status, 400, limit);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.equal(error.fields[0].field, 'limit');
    }
  });
});
