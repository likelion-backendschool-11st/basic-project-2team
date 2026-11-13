'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');
const { createPostRepository } = require('../../src/post/postRepository');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const AUTHOR = 7;
const MEMBER = 8;
const OTHER = 9;

/** DB 대신 메모리에 저장하는 가짜 repository (상태 전이 규칙은 실제 repository 와 같게 흉내) */
function createFakeRepository() {
  const state = { posts: new Map(), acceptedCount: new Map(), completions: [] };
  return {
    state,
    async findPostAuthor(postId) {
      const p = state.posts.get(postId);
      return p ? { authorId: p.authorId, status: p.status } : null;
    },
    async changePostStatus(postId, status) {
      const p = state.posts.get(postId);
      if (!p) return 'NOT_FOUND';
      if (p.status === status) return 'UNCHANGED';
      if (p.status === 'COMPLETED') return 'ALREADY_COMPLETED';
      if (status === 'COMPLETED' && !(state.acceptedCount.get(postId) > 0)) return 'NO_PARTY_MEMBERS';
      p.status = status;
      if (status === 'COMPLETED') state.completions.push(postId);
      return 'CHANGED';
    },
  };
}

describe('PATCH /api/posts/:postId/status', () => {
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
  beforeEach(() => {
    repo.state.posts.clear();
    repo.state.posts.set(1, { authorId: AUTHOR, status: 'OPEN' });
    repo.state.acceptedCount = new Map([[1, 2]]);
    repo.state.completions = [];
  });

  const patch = (id, body, memberId = AUTHOR) =>
    fetch(`${baseUrl}/api/posts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {}) },
      body: JSON.stringify(body),
    });
  const expectError = async (res, status, code) => {
    assert.equal(res.status, status);
    const json = await res.json();
    assert.equal(json.error.code, code);
    return json.error;
  };

  it('작성자는 OPEN ↔ CLOSED 를 바꿀 수 있고 200 { id, status } 를 돌려준다', async () => {
    let res = await patch(1, { status: 'CLOSED' });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).data, { id: 1, status: 'CLOSED' });
    res = await patch(1, { status: 'OPEN' });
    assert.equal(res.status, 200);
    assert.equal(repo.state.posts.get(1).status, 'OPEN');
  });

  it('활동 완료(COMPLETED) 처리하면 200 이고, 같은 상태로 다시 요청해도 200 (한 번만 처리)', async () => {
    assert.equal((await patch(1, { status: 'COMPLETED' })).status, 200);
    assert.equal((await patch(1, { status: 'COMPLETED' })).status, 200);
    assert.deepEqual(repo.state.completions, [1]);
  });

  it('활동 완료된 공고는 되돌릴 수 없다 → 409 POST_ALREADY_COMPLETED', async () => {
    await patch(1, { status: 'COMPLETED' });
    await expectError(await patch(1, { status: 'OPEN' }), 409, 'POST_ALREADY_COMPLETED');
    assert.equal(repo.state.posts.get(1).status, 'COMPLETED');
  });

  it('승인된 파티원이 없으면 409 NO_PARTY_MEMBERS', async () => {
    repo.state.acceptedCount.set(1, 0);
    await expectError(await patch(1, { status: 'COMPLETED' }), 409, 'NO_PARTY_MEMBERS');
    assert.equal(repo.state.posts.get(1).status, 'OPEN');
  });

  it('status 가 OPEN · CLOSED · COMPLETED 가 아니면 400 INVALID_INPUT', async () => {
    for (const body of [{}, { status: 'DELETED' }, { status: 'open' }, { status: 1 }]) {
      const error = await expectError(await patch(1, body), 400, 'INVALID_INPUT');
      assert.equal(error.fields[0].field, 'status');
    }
  });

  it('작성자가 아니면 403 NOT_POST_AUTHOR', async () => {
    await expectError(await patch(1, { status: 'CLOSED' }, OTHER), 403, 'NOT_POST_AUTHOR');
    assert.equal(repo.state.posts.get(1).status, 'OPEN');
  });

  it('없는 공고·잘못된 postId 는 404, 로그인하지 않으면 401', async () => {
    for (const id of ['999', 'abc', '0']) await expectError(await patch(id, { status: 'CLOSED' }), 404, 'POST_NOT_FOUND');
    assert.equal((await patch(1, { status: 'CLOSED' }, null)).status, 401);
  });
});

/** 실제 repository 의 완료 트랜잭션을 가짜 connection 으로 확인합니다. */
describe('postRepository.changePostStatus — 활동 완료 트랜잭션', () => {
  function createFakePool({ status = 'OPEN', accepted = [MEMBER], failOnAward = false } = {}) {
    const log = { queries: [], commit: 0, rollback: 0, release: 0 };
    const members = new Map([
      [AUTHOR, { activityPoint: 30, level: 1 }],
      [MEMBER, { activityPoint: 0, level: 1 }],
    ]);
    const connection = {
      async beginTransaction() {},
      async commit() {
        log.commit += 1;
      },
      async rollback() {
        log.rollback += 1;
      },
      release() {
        log.release += 1;
      },
      async query(sql, params = []) {
        const text = sql.replace(/\s+/g, ' ').trim();
        log.queries.push([text.slice(0, 40), params]);
        if (text.startsWith('SELECT author_id AS authorId, status FROM post')) return [[{ authorId: AUTHOR, status }]];
        if (text.startsWith('SELECT pa.applicant_id AS memberId')) return [accepted.map((memberId) => ({ memberId }))];
        if (text.startsWith('UPDATE post SET status')) return [{ affectedRows: 1 }];
        if (text.startsWith('SELECT id FROM member WHERE id IN')) return [[]];
        if (text.startsWith('INSERT INTO activity_point_log')) {
          if (failOnAward) throw new Error('boom');
          return [{}];
        }
        if (text.startsWith('SELECT activity_point AS activityPoint')) return [[{ ...members.get(params[0]) }]];
        if (text.startsWith('UPDATE member SET activity_point')) {
          members.set(params[2], { activityPoint: params[0], level: params[1] });
          return [{}];
        }
        throw new Error(`예상하지 못한 SQL: ${text}`);
      },
    };
    return { pool: { getConnection: async () => connection }, log, members };
  }

  it('파티장과 승인된 파티원에게 PARTY_COMPLETE +20 을 지급하고 커밋한다', async () => {
    const fake = createFakePool();
    assert.equal(await createPostRepository(fake.pool).changePostStatus(1, 'COMPLETED'), 'CHANGED');
    const awards = fake.log.queries.filter(([text]) => text.startsWith('INSERT INTO activity_point_log')).map(([, params]) => params[0]);
    assert.deepEqual(awards, [[[AUTHOR, 'PARTY_COMPLETE', 1, 20]], [[MEMBER, 'PARTY_COMPLETE', 1, 20]]]);
    assert.deepEqual(fake.members.get(AUTHOR), { activityPoint: 50, level: 2 });
    assert.deepEqual(fake.members.get(MEMBER), { activityPoint: 20, level: 1 });
    assert.deepEqual([fake.log.commit, fake.log.rollback, fake.log.release], [1, 0, 1]);
  });

  it('승인된 파티원이 없으면 상태를 바꾸지 않고 NO_PARTY_MEMBERS', async () => {
    const fake = createFakePool({ accepted: [] });
    assert.equal(await createPostRepository(fake.pool).changePostStatus(1, 'COMPLETED'), 'NO_PARTY_MEMBERS');
    assert.equal(fake.log.queries.some(([text]) => text.startsWith('UPDATE post')), false);
  });

  it('이미 완료된 공고는 ALREADY_COMPLETED, 같은 상태면 UNCHANGED (점수 중복 지급 없음)', async () => {
    const completed = createFakePool({ status: 'COMPLETED' });
    const repo = createPostRepository(completed.pool);
    assert.equal(await repo.changePostStatus(1, 'OPEN'), 'ALREADY_COMPLETED');
    assert.equal(await repo.changePostStatus(1, 'COMPLETED'), 'UNCHANGED');
    assert.equal(completed.log.queries.some(([text]) => text.startsWith('INSERT INTO activity_point_log')), false);
  });

  it('점수 지급 중 실패하면 롤백한다', async () => {
    const fake = createFakePool({ failOnAward: true });
    await assert.rejects(createPostRepository(fake.pool).changePostStatus(1, 'COMPLETED'), /boom/);
    assert.deepEqual([fake.log.commit, fake.log.rollback, fake.log.release], [0, 1, 1]);
  });
});
