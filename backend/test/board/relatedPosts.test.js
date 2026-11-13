'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

const row = (id) => ({
  id,
  categoryCode: 'mmorpg',
  gameCode: 'lostark',
  gameName: '로스트아크',
  partyType: 'raid',
  title: `공고 ${id}`,
  headcount: 8,
  currentCount: 3,
  scheduleAt: null,
  voiceRequired: 0,
  status: 'OPEN',
  viewCount: 1,
  commentCount: 0,
  createdAt: new Date('2026-11-12T11:30:00Z'),
  authorNickname: '빛나는오더',
  authorStatus: 'ACTIVE',
});

/** 넘어온 조건을 기록하고 정해 둔 행을 돌려주는 가짜 repository */
function createFakeRepository() {
  const state = { rows: [], tags: new Map(), last: null, missing: false };
  return {
    state,
    async findRelatedPosts(arg) {
      state.last = arg;
      return state.missing ? null : state.rows;
    },
    async findTagNamesByPostIds(ids) {
      return new Map(ids.filter((id) => state.tags.has(id)).map((id) => [id, state.tags.get(id)]));
    },
    async increaseViewCount() {
      throw new Error('상세로 라우팅됨 — 조회수가 올라가면 안 된다');
    },
  };
}

describe('GET /api/posts/:postId/related', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const NOW = new Date('2026-11-14T00:00:00Z');

  before(async () => {
    const app = createApp({ boardRepository: repo, corsOrigins: [], bcryptRounds: 4, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    Object.assign(repo.state, { rows: [row(5), row(4)], tags: new Map([[5, ['숙련']]]), last: null, missing: false });
  });

  const get = (path) => fetch(`${baseUrl}/api/posts/${path}`);

  it('목록 아이템과 같은 모양의 배열을 돌려주고 기본 limit 4 를 쓴다', async () => {
    const res = await get('1/related');
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(data.map((p) => p.id), [5, 4]);
    assert.deepEqual(data[0].tags, ['숙련']);
    assert.deepEqual(data[1].tags, []);
    assert.equal(data[0].game, 'lostark');
    assert.deepEqual(repo.state.last, { postId: 1, limit: 4, now: NOW });
  });

  it('limit 를 받고 1~20 밖이거나 숫자가 아니면 400', async () => {
    assert.equal((await get('1/related?limit=10')).status, 200);
    assert.equal(repo.state.last.limit, 10);
    for (const limit of ['0', '21', 'abc', '1.5']) {
      const res = await get(`1/related?limit=${limit}`);
      assert.equal(res.status, 400, limit);
      assert.equal((await res.json()).error.fields[0].field, 'limit');
    }
  });

  it('관련 공고가 없으면 빈 배열이다', async () => {
    repo.state.rows = [];
    assert.deepEqual((await (await get('1/related')).json()).data, []);
  });

  it('기준 공고가 없거나 삭제됐으면, 형식이 틀린 id 이면 404 POST_NOT_FOUND', async () => {
    repo.state.missing = true;
    assert.equal((await get('1/related')).status, 404);
    repo.state.missing = false;
    for (const id of ['abc', '0', '-1']) {
      const res = await get(`${id}/related`);
      assert.equal(res.status, 404, id);
      assert.equal((await res.json()).error.code, 'POST_NOT_FOUND');
    }
  });
});
