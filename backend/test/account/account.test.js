'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const PASSWORD = 'abc123!@';
const NEW_PASSWORD = 'xyz789#!';
const ME = 1;
const OTHER = 2;
const NOW = new Date('2026-11-13T00:00:00Z');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const GAMES = Object.freeze({
  lostark: { id: 1, name: '로스트아크' },
  valorant: { id: 2, name: '발로란트' },
  lol: { id: 3, name: '리그 오브 레전드' },
});

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = {};
  const reset = (passwordHash) => {
    state.members = new Map([
      [
        ME,
        {
          id: ME,
          loginId: 'healer01',
          passwordHash,
          nickname: '빛나는힐러',
          email: 'healer@example.com',
          phone: '01012345678',
          name: null,
          bio: '힐러입니다.',
          ageRange: '20대',
          ageRangePublic: 1,
          avatarUrl: null,
          level: 48,
          mannerTemp: '98.4',
          status: 'ACTIVE',
          createdAt: new Date('2026-10-01T00:00:00Z'),
        },
      ],
      [OTHER, { id: OTHER, nickname: '철수', status: 'ACTIVE' }],
    ]);
    /** memberId → [{ code, isMain, playStyle }] */
    state.gameProfiles = new Map([[ME, [{ code: 'lostark', isMain: true, playStyle: 'casual' }]]]);
    state.activeParties = { hosting: 0, joined: 0 };
    state.sanctionTypes = [];
    state.passwordUpdates = [];
    state.withdrawals = [];
  };
  const codeById = (gameId) => Object.keys(GAMES).find((code) => GAMES[code].id === gameId);
  return {
    state,
    reset,
    async findAccount(memberId) {
      const row = state.members.get(memberId);
      return row ? { ...row } : null;
    },
    async findGameProfiles(memberId) {
      return (state.gameProfiles.get(memberId) ?? [])
        .map((p) => ({ code: p.code, name: GAMES[p.code].name, isMain: p.isMain ? 1 : 0, playStyle: p.playStyle }))
        .sort((a, b) => b.isMain - a.isMain);
    },
    async findGameIdsByCodes(codes) {
      return new Map(codes.filter((code) => GAMES[code]).map((code) => [code, GAMES[code].id]));
    },
    async existsNicknameOfOther(nickname, memberId) {
      return [...state.members.values()].some((m) => m.nickname === nickname && m.id !== memberId);
    },
    async updateProfile({ memberId, fields, games }) {
      Object.assign(state.members.get(memberId), fields);
      if (games) {
        state.gameProfiles.set(
          memberId,
          games.entries.map((e) => ({ code: codeById(e.gameId), isMain: e.isMain, playStyle: games.playStyle })),
        );
      }
    },
    async updatePassword({ memberId, passwordHash, now }) {
      state.members.get(memberId).passwordHash = passwordHash;
      state.passwordUpdates.push({ memberId, now });
    },
    async countActiveParties() {
      return state.activeParties;
    },
    async findSanctionTypes() {
      return state.sanctionTypes;
    },
    async withdraw({ memberId, withdrawal, now }) {
      const member = state.members.get(memberId);
      if (member.status === 'WITHDRAWN') return false;
      Object.assign(member, { status: 'WITHDRAWN', loginId: null, nickname: null, email: null, phone: null, passwordHash: null });
      state.withdrawals.push({ memberId, ...withdrawal, now });
      return true;
    },
  };
}

describe('내 계정 관리 API (/api/members/me)', () => {
  let server;
  let baseUrl;
  let passwordHash;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const app = createApp({ accountRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => repo.reset(passwordHash));

  const auth = (memberId = ME) => ({ Authorization: `Bearer ${tokens.createAccessToken(memberId)}` });
  const call = (method, path, body, headers = auth()) =>
    fetch(`${baseUrl}/api/members${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const errorOf = async (res) => (await res.json()).error;

  describe('GET /me', () => {
    it('내 계정 정보와 게이머 프로필을 돌려준다', async () => {
      const res = await call('GET', '/me');
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.deepEqual(data, {
        id: ME,
        userId: 'healer01',
        nickname: '빛나는힐러',
        email: 'healer@example.com',
        phone: '01012345678',
        name: null,
        bio: '힐러입니다.',
        ageRange: '20대',
        ageRangePublic: true,
        avatarUrl: null,
        level: 48,
        mannerTemp: 98.4,
        games: [{ code: 'lostark', name: '로스트아크', isMain: true, playStyle: 'casual' }],
        createdAt: '2026-10-01T00:00:00.000Z',
      });
    });

    it('토큰이 없으면 401, 탈퇴한 회원의 토큰이면 401', async () => {
      assert.equal((await call('GET', '/me', undefined, {})).status, 401);
      repo.state.members.get(ME).status = 'WITHDRAWN';
      const res = await call('GET', '/me');
      assert.equal(res.status, 401);
      assert.equal((await errorOf(res)).code, 'UNAUTHORIZED');
    });
  });

  describe('PATCH /me', () => {
    it('보낸 항목만 바꾸고 바뀐 내 정보를 돌려준다', async () => {
      const res = await call('PATCH', '/me', { nickname: '  새닉네임 ', bio: '  ', ageRangePublic: false });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.nickname, '새닉네임');
      assert.equal(data.bio, null);
      assert.equal(data.ageRange, '20대');
      assert.equal(data.ageRangePublic, false);
      assert.deepEqual(data.games, [{ code: 'lostark', name: '로스트아크', isMain: true, playStyle: 'casual' }]);
    });

    it('games 를 보내면 게이머 프로필을 교체한다 (mainGame 생략 시 첫 번째)', async () => {
      const { data } = await (await call('PATCH', '/me', { games: ['valorant', 'lol', 'valorant'], playStyle: 'hard' })).json();
      assert.deepEqual(data.games, [
        { code: 'valorant', name: '발로란트', isMain: true, playStyle: 'hard' },
        { code: 'lol', name: '리그 오브 레전드', isMain: false, playStyle: 'hard' },
      ]);

      const cleared = await (await call('PATCH', '/me', { games: [] })).json();
      assert.deepEqual(cleared.data.games, []);
    });

    it('mainGame 으로 대표 게임을 고른다', async () => {
      const { data } = await (await call('PATCH', '/me', { games: ['lostark', 'lol'], mainGame: 'lol' })).json();
      assert.deepEqual(
        data.games.filter((game) => game.isMain).map((game) => game.code),
        ['lol'],
      );
    });

    it('지금 닉네임 그대로면 중복이 아니다', async () => {
      assert.equal((await call('PATCH', '/me', { nickname: '빛나는힐러' })).status, 200);
    });

    it('다른 회원이 쓰는 닉네임이면 409 DUPLICATE_NICKNAME', async () => {
      const res = await call('PATCH', '/me', { nickname: '철수' });
      assert.equal(res.status, 409);
      assert.equal((await errorOf(res)).code, 'DUPLICATE_NICKNAME');
    });

    it('잘못된 값은 필드별 400 INVALID_INPUT', async () => {
      const res = await call('PATCH', '/me', {
        nickname: '공 백',
        bio: 'x'.repeat(201),
        ageRangePublic: 'yes',
        games: ['lostark'],
        mainGame: 'lol',
        playStyle: 'voice',
      });
      assert.equal(res.status, 400);
      const error = await errorOf(res);
      assert.equal(error.code, 'INVALID_INPUT');
      assert.deepEqual(
        error.fields.map((field) => field.field),
        ['nickname', 'bio', 'ageRangePublic', 'mainGame', 'playStyle'],
      );
    });

    it('games 없이 mainGame·playStyle 만 보내면 400', async () => {
      const res = await call('PATCH', '/me', { playStyle: 'hard' });
      assert.equal(res.status, 400);
      assert.equal((await errorOf(res)).fields[0].field, 'games');
    });

    it('없는 게임 코드가 있으면 400 (games 필드)', async () => {
      const res = await call('PATCH', '/me', { games: ['lostark', 'unknown'] });
      assert.equal(res.status, 400);
      assert.equal((await errorOf(res)).fields[0].field, 'games');
      assert.deepEqual(
        repo.state.gameProfiles.get(ME).map((p) => p.code),
        ['lostark'],
      );
    });
  });

  describe('PATCH /me/password', () => {
    it('현재 비밀번호가 맞으면 204 로 바꾼다', async () => {
      const res = await call('PATCH', '/me/password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      assert.equal(res.status, 204);
      assert.equal(await bcrypt.compare(NEW_PASSWORD, repo.state.members.get(ME).passwordHash), true);
      assert.deepEqual(repo.state.passwordUpdates, [{ memberId: ME, now: NOW }]);
    });

    it('현재 비밀번호가 틀리면 400 INVALID_PASSWORD', async () => {
      const res = await call('PATCH', '/me/password', { currentPassword: 'wrong12!@', newPassword: NEW_PASSWORD });
      assert.equal(res.status, 400);
      assert.equal((await errorOf(res)).code, 'INVALID_PASSWORD');
      assert.equal(repo.state.passwordUpdates.length, 0);
    });

    it('새 비밀번호가 지금과 같으면 400 SAME_PASSWORD', async () => {
      const res = await call('PATCH', '/me/password', { currentPassword: PASSWORD, newPassword: PASSWORD });
      assert.equal(res.status, 400);
      assert.equal((await errorOf(res)).code, 'SAME_PASSWORD');
    });

    it('새 비밀번호가 규칙에 맞지 않거나 현재 비밀번호가 비면 필드별 400', async () => {
      const res = await call('PATCH', '/me/password', { newPassword: 'short' });
      assert.equal(res.status, 400);
      assert.deepEqual(
        (await errorOf(res)).fields.map((field) => field.field),
        ['currentPassword', 'newPassword'],
      );
    });
  });

  describe('DELETE /me', () => {
    it('비밀번호가 맞으면 204 로 탈퇴하고, 제재 이력이 없으면 30일 뒤 파기·재가입 제한 없음', async () => {
      const res = await call('DELETE', '/me', { password: PASSWORD, reason: '  잘 안 써요 ' });
      assert.equal(res.status, 204);
      assert.deepEqual(repo.state.withdrawals, [
        {
          memberId: ME,
          phoneHash: sha256('01012345678'),
          emailHash: sha256('healer@example.com'),
          reason: '잘 안 써요',
          hadSanction: false,
          rejoinBlockedUntil: null,
          purgeAt: new Date('2026-12-13T00:00:00Z'),
          now: NOW,
        },
      ]);
      // 탈퇴 후에는 같은 토큰으로 내 정보를 볼 수 없다
      assert.equal((await call('GET', '/me')).status, 401);
    });

    it('경고·정지 이력이 있으면 6개월 재가입 제한, 영구 정지 이력이 있으면 영구 제한', async () => {
      repo.state.sanctionTypes = ['WARNING', 'SUSPEND'];
      await call('DELETE', '/me', { password: PASSWORD });
      const sixMonths = new Date('2027-05-13T00:00:00Z');
      const [record] = repo.state.withdrawals;
      assert.deepEqual(
        { hadSanction: record.hadSanction, rejoinBlockedUntil: record.rejoinBlockedUntil, purgeAt: record.purgeAt, reason: record.reason },
        { hadSanction: true, rejoinBlockedUntil: sixMonths, purgeAt: sixMonths, reason: null },
      );

      repo.reset(passwordHash);
      repo.state.sanctionTypes = ['WARNING', 'BAN'];
      await call('DELETE', '/me', { password: PASSWORD });
      assert.equal(repo.state.withdrawals[0].rejoinBlockedUntil.toISOString(), '9999-12-31T00:00:00.000Z');
    });

    it('비밀번호가 틀리면 400 INVALID_PASSWORD', async () => {
      const res = await call('DELETE', '/me', { password: 'wrong12!@' });
      assert.equal(res.status, 400);
      assert.equal((await errorOf(res)).code, 'INVALID_PASSWORD');
      assert.equal(repo.state.withdrawals.length, 0);
    });

    it('진행 중인 파티가 있으면 409 ACTIVE_PARTY_EXISTS', async () => {
      for (const activeParties of [
        { hosting: 1, joined: 0 },
        { hosting: 0, joined: 2 },
      ]) {
        repo.state.activeParties = activeParties;
        const res = await call('DELETE', '/me', { password: PASSWORD });
        assert.equal(res.status, 409);
        assert.equal((await errorOf(res)).code, 'ACTIVE_PARTY_EXISTS');
      }
      assert.equal(repo.state.withdrawals.length, 0);
    });

    it('비밀번호가 없거나 사유가 너무 길면 필드별 400', async () => {
      const res = await call('DELETE', '/me', { reason: 'x'.repeat(201) });
      assert.equal(res.status, 400);
      assert.deepEqual(
        (await errorOf(res)).fields.map((field) => field.field),
        ['password', 'reason'],
      );
    });
  });

  it('GET /api/members/{id} (mypage) 라우트와 겹치지 않는다', async () => {
    const res = await call('GET', '/me');
    assert.equal(res.status, 200);
  });
});
