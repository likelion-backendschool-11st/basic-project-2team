'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

const row = (id, overrides = {}) => ({
  id,
  categoryCode: 'mmorpg',
  gameCode: 'lostark',
  gameName: '로스트아크',
  partyType: 'raid',
  title: `공고 ${id}`,
  headcount: 8,
  currentCount: 7,
  scheduleAt: new Date('2026-11-15T12:00:00Z'),
  voiceRequired: 0,
  status: 'OPEN',
  viewCount: 10,
  commentCount: 2,
  createdAt: new Date('2026-11-12T11:30:00Z'),
  authorNickname: '빛나는오더',
  authorStatus: 'ACTIVE',
  ...overrides,
});

/** findFeaturedPosts 에 넘어온 조건을 기록하고 정해 둔 행을 돌려주는 가짜 repository */
function createFakeRepository() {
  const state = { rows: [], tags: new Map(), lastFilter: null };
  return {
    state,
    async findFeaturedPosts(filter) {
      state.lastFilter = filter;
      return state.rows;
    },
    async findTagNamesByPostIds(ids) {
      return new Map(ids.filter((id) => state.tags.has(id)).map((id) => [id, state.tags.get(id)]));
    },
    // 상세(/:postId)로 잘못 라우팅되면 호출되는 메서드 — 고정 경로가 먼저 잡히는지 확인용
    async increaseViewCount() {
      throw new Error('/:postId 로 라우팅됨');
    },
  };
}

describe('GET /api/posts/popular · urgent (메인)', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();

  before(async () => {
    const app = createApp({ boardRepository: repo, corsOrigins: [], bcryptRounds: 4 });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.rows = [row(2, { scheduleAt: null, authorStatus: 'WITHDRAWN' }), row(1)];
    repo.state.tags = new Map([[1, ['숙련']]]);
    repo.state.lastFilter = null;
  });

  const get = (path) => fetch(`${baseUrl}/api/posts/${path}`);

  for (const kind of ['popular', 'urgent']) {
    it(`${kind}: 목록 아이템과 같은 모양의 배열을 돌려주고 기본 조건을 쓴다`, async () => {
      const res = await get(kind);
      assert.equal(res.status, 200);
      const { success, data } = await res.json();
      assert.equal(success, true);
      assert.deepEqual(data.map((item) => item.id), [2, 1]);
      assert.deepEqual(data[1], {
        id: 1,
        category: 'mmorpg',
        game: 'lostark',
        gameName: '로스트아크',
        type: 'raid',
        title: '공고 1',
        current: 7,
        max: 8,
        tags: ['숙련'],
        author: '빛나는오더',
        schedule: '2026-11-15T12:00:00.000Z',
        scheduleTbd: false,
        voiceRequired: false,
        views: 10,
        commentCount: 2,
        status: 'OPEN',
        createdAt: '2026-11-12T11:30:00.000Z',
      });
      assert.equal(data[0].author, '탈퇴한 회원');
      assert.equal(data[0].scheduleTbd, true);

      const { limit, category, now } = repo.state.lastFilter;
      assert.deepEqual([repo.state.lastFilter.kind, limit, category], [kind, 4, null]);
      assert.ok(Math.abs(now.getTime() - Date.now()) < 5000);
    });

    it(`${kind}: category 와 limit 를 넘긴다`, async () => {
      await get(`${kind}?category=fps&limit=10`);
      assert.deepEqual([repo.state.lastFilter.category, repo.state.lastFilter.limit], ['fps', 10]);
    });

    it(`${kind}: 잘못된 limit · category 는 필드별 400`, async () => {
      for (const query of ['limit=0', 'limit=21', 'limit=abc', 'limit=1.5']) {
        const res = await get(`${kind}?${query}`);
        assert.equal(res.status, 400, query);
        assert.deepEqual((await res.json()).error.fields.map((f) => f.field), ['limit'], query);
      }
      const res = await get(`${kind}?category=BAD!`);
      assert.deepEqual((await res.json()).error.fields.map((f) => f.field), ['category']);
    });
  }
});
