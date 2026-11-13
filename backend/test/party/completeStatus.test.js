'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createPartyRepository } = require('../../src/party/partyRepository');

const AUTHOR = 7;
const MEMBER = 8;
const NOW = new Date('2026-11-14T00:00:00Z');

/** 실제 repository 의 상태 변경 트랜잭션(활동 점수 지급 포함)을 가짜 connection 으로 확인합니다. */
function createFakePool({ status = 'OPEN', accepted = [MEMBER], scheduleAt = null, failOnAward = false } = {}) {
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
      if (text.startsWith('SELECT author_id AS authorId, status, headcount')) {
        return [[{ authorId: AUTHOR, status, headcount: 5, current: 1 + accepted.length, scheduleAt }]];
      }
      if (text.startsWith('SELECT pa.applicant_id AS memberId')) return [accepted.map((memberId) => ({ memberId }))];
      if (text.startsWith('UPDATE post SET status')) return [{ affectedRows: 1 }];
      if (text.startsWith('SELECT id FROM member WHERE id IN')) return [[]];
      if (text.startsWith('INSERT INTO notification')) return [{ affectedRows: 0 }];
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

const change = (pool, status) => createPartyRepository(pool).changePostStatus({ postId: 1, status, now: NOW, notice: null });
const awards = (log) => log.queries.filter(([text]) => text.startsWith('INSERT INTO activity_point_log')).map(([, params]) => params[0]);
const wrote = (log) => log.queries.some(([text]) => text.startsWith('UPDATE post'));

describe('partyRepository.changePostStatus — 활동 완료 트랜잭션', () => {
  it('파티장과 승인된 파티원에게 PARTY_COMPLETE +20 을 지급하고 커밋한다', async () => {
    const fake = createFakePool();
    assert.equal((await change(fake.pool, 'COMPLETED')).result, 'OK');
    assert.deepEqual(awards(fake.log), [[[AUTHOR, 'PARTY_COMPLETE', 1, 20]], [[MEMBER, 'PARTY_COMPLETE', 1, 20]]]);
    assert.deepEqual(fake.members.get(AUTHOR), { activityPoint: 50, level: 2 });
    assert.deepEqual(fake.members.get(MEMBER), { activityPoint: 20, level: 1 });
    assert.deepEqual([fake.log.commit, fake.log.rollback, fake.log.release], [1, 0, 1]);
  });

  it('승인된 파티원(탈퇴 제외)이 없으면 NO_MEMBERS 이고 아무것도 바꾸지 않는다', async () => {
    const fake = createFakePool({ accepted: [] });
    assert.equal((await change(fake.pool, 'COMPLETED')).result, 'NO_MEMBERS');
    assert.equal(wrote(fake.log), false);
  });

  it('출발 전이면 NOT_STARTED 이고 점수도 지급하지 않는다', async () => {
    const fake = createFakePool({ scheduleAt: new Date('2026-11-15T00:00:00Z') });
    assert.equal((await change(fake.pool, 'COMPLETED')).result, 'NOT_STARTED');
    assert.equal(wrote(fake.log) || awards(fake.log).length > 0, false);
  });

  it('이미 완료된 공고는 COMPLETED, 같은 상태면 OK (점수 중복 지급 없음)', async () => {
    const done = createFakePool({ status: 'COMPLETED' });
    assert.equal((await change(done.pool, 'OPEN')).result, 'COMPLETED');
    assert.equal((await change(done.pool, 'COMPLETED')).result, 'OK');
    assert.equal(awards(done.log).length, 0);
  });

  it('마감·재개는 점수를 지급하지 않는다', async () => {
    const fake = createFakePool();
    assert.equal((await change(fake.pool, 'CLOSED')).result, 'OK');
    assert.equal(awards(fake.log).length, 0);
  });

  it('점수 지급 중 실패하면 롤백한다', async () => {
    const fake = createFakePool({ failOnAward: true });
    await assert.rejects(change(fake.pool, 'COMPLETED'), /boom/);
    assert.deepEqual([fake.log.commit, fake.log.rollback, fake.log.release], [0, 1, 1]);
  });
});
