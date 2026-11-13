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
  currentCount: 3,
  scheduleAt: new Date('2026-11-15T12:00:00Z'),
  voiceRequired: 1,
  status: 'OPEN',
  viewCount: 10,
  commentCount: 2,
  createdAt: new Date('2026-11-12T11:30:00Z'),
  authorNickname: '빛나는오더',
  authorStatus: 'ACTIVE',
  ...overrides,
});

/** DB 대신 findPostPage 에 넘어온 조건을 기록하고 정해 둔 결과를 돌려주는 가짜 repository */
function createFakeRepository() {
  const state = { rows: [], totalCount: 0, tags: new Map(), lastFilter: null };
  return {
    state,
    async findPostPage(filter) {
      state.lastFilter = filter;
      return { rows: state.rows, totalCount: state.totalCount };
    },
    async findTagNamesByPostIds(ids) {
      return new Map(ids.filter((id) => state.tags.has(id)).map((id) => [id, state.tags.get(id)]));
    },
  };
}

describe('GET /api/posts (목록)', () => {
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
    repo.state.rows = [row(2, { authorStatus: 'WITHDRAWN', scheduleAt: null }), row(1)];
    repo.state.totalCount = 17;
    repo.state.tags = new Map([[1, ['숙련', '디코필수']]]);
    repo.state.lastFilter = null;
  });

  const get = (query = '') => fetch(`${baseUrl}/api/posts${query}`);

  it('로그인 없이 목록을 페이지네이션 형식으로 돌려준다', async () => {
    const res = await get();
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.deepEqual(
      { page: data.page, size: data.size, totalCount: data.totalCount, totalPages: data.totalPages },
      { page: 1, size: 8, totalCount: 17, totalPages: 3 },
    );
    assert.deepEqual(data.items[1], {
      id: 1,
      category: 'mmorpg',
      game: 'lostark',
      gameName: '로스트아크',
      type: 'raid',
      title: '공고 1',
      current: 3,
      max: 8,
      tags: ['숙련', '디코필수'],
      author: '빛나는오더',
      schedule: '2026-11-15T12:00:00.000Z',
      scheduleTbd: false,
      voiceRequired: true,
      views: 10,
      commentCount: 2,
      status: 'OPEN',
      createdAt: '2026-11-12T11:30:00.000Z',
    });
  });

  it('탈퇴한 작성자는 "탈퇴한 회원", 일정 미정은 schedule null, 태그 없으면 빈 배열', async () => {
    const { data } = await (await get()).json();
    assert.equal(data.items[0].author, '탈퇴한 회원');
    assert.equal(data.items[0].schedule, null);
    assert.equal(data.items[0].scheduleTbd, true);
    assert.deepEqual(data.items[0].tags, []);
  });

  it('기본값: 전체 카테고리, 최신순, 1페이지 8개', async () => {
    await get();
    assert.deepEqual(repo.state.lastFilter, {
      category: null,
      q: '',
      sort: 'recent',
      tags: [],
      excludeClosed: false,
      limit: 8,
      offset: 0,
    });
  });

  it('category·q·sort·tags·page·size·excludeClosed 를 조건으로 넘긴다', async () => {
    await get('?category=fps&q=%20카멘%20&sort=urgent&tags=숙련,%23디코필수&tags=숙련&page=3&size=5&excludeClosed=true');
    assert.deepEqual(repo.state.lastFilter, {
      category: 'fps',
      q: '카멘',
      sort: 'urgent',
      tags: ['숙련', '디코필수'],
      excludeClosed: true,
      limit: 5,
      offset: 10,
    });
  });

  it('결과가 없으면 빈 배열과 totalPages 0', async () => {
    repo.state.rows = [];
    repo.state.totalCount = 0;
    const { data } = await (await get('?category=etc')).json();
    assert.deepEqual(data.items, []);
    assert.equal(data.totalPages, 0);
  });

  it('잘못된 쿼리는 필드별 오류와 함께 400', async () => {
    const res = await get('?category=A%20B&sort=best&page=0&size=51&excludeClosed=maybe&tags=1,2,3,4,5,6&q=' + 'a'.repeat(51));
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'INVALID_INPUT');
    assert.deepEqual(error.fields.map((f) => f.field).sort(), ['category', 'excludeClosed', 'page', 'q', 'size', 'sort', 'tags']);
    assert.equal(repo.state.lastFilter, null);
  });

  it('page·size 가 정수가 아니면 400', async () => {
    assert.equal((await get('?page=abc')).status, 400);
    assert.equal((await get('?size=1.5')).status, 400);
  });
});
