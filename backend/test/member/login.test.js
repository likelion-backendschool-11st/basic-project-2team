'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = 'abc123!@';

/** DB 대신 메모리에 저장하는 가짜 repository (로그인·토큰 관련 메서드만) */
function createFakeRepository() {
  const state = { members: [], tokens: [], sanctions: [] };
  const byId = (id) => state.members.find((m) => m.id === id) ?? null;
  // 실제 DB 처럼 조회 시점의 복사본을 돌려줌
  const snapshot = (row) => (row ? { ...row } : null);
  return {
    state,
    async findAuthMemberByLoginId(loginId) {
      return snapshot(state.members.find((m) => m.loginId === loginId));
    },
    async findAuthMemberById(id) {
      return snapshot(byId(id));
    },
    async findActiveRestriction({ memberId, type }) {
      const active = state.sanctions
        .filter((s) => s.memberId === memberId && s.type === type && !s.releasedAt)
        .sort((a, b) => (b.endsAt?.getTime() ?? Infinity) - (a.endsAt?.getTime() ?? Infinity));
      const row = active[0];
      return row ? { reason: row.reason, startsAt: row.startsAt, endsAt: row.endsAt } : null;
    },
    async recordLoginFailure({ memberId, maxFailures, lockedUntil }) {
      const m = byId(memberId);
      if (m.loginFailCount + 1 >= maxFailures) {
        m.lockedUntil = lockedUntil;
        m.loginFailCount = 0;
      } else {
        m.loginFailCount += 1;
      }
    },
    async recordLoginSuccess({ memberId, now }) {
      Object.assign(byId(memberId), { loginFailCount: 0, lockedUntil: null, lastLoginAt: now });
    },
    async saveRefreshToken({ memberId, tokenHash, expiresAt }) {
      state.tokens.push({ id: state.tokens.length + 1, memberId, tokenHash, expiresAt, revokedAt: null });
    },
    async findRefreshToken(tokenHash) {
      return snapshot(state.tokens.find((t) => t.tokenHash === tokenHash));
    },
    async revokeRefreshToken({ id, now }) {
      const token = state.tokens.find((t) => t.id === id);
      if (token.revokedAt) return false;
      token.revokedAt = now;
      return true;
    },
    async revokeAllRefreshTokens({ memberId, now }) {
      for (const t of state.tokens) if (t.memberId === memberId && !t.revokedAt) t.revokedAt = now;
    },
  };
}

describe('member login API', () => {
  let server;
  let baseUrl;
  let repo;
  let passwordHash;
  let clock;

  before(async () => {
    repo = createFakeRepository();
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const app = createApp({
      memberRepository: repo,
      corsOrigins: ['http://localhost:5173'],
      bcryptRounds: 4,
      auth: AUTH,
      now: () => clock,
    });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    clock = new Date('2026-11-13T00:00:00Z');
    repo.state.tokens.length = 0;
    repo.state.members.length = 0;
    repo.state.sanctions.length = 0;
    repo.state.members.push({
      id: 1,
      loginId: 'healer01',
      passwordHash,
      nickname: '빛나는힐러',
      status: 'ACTIVE',
      suspendedUntil: null,
      lockedUntil: null,
      loginFailCount: 0,
      level: 48,
      mannerTemp: 98.4,
      avatarUrl: null,
    });
  });

  const member = () => repo.state.members[0];
  const advance = (ms) => {
    clock = new Date(clock.getTime() + ms);
  };

  const request = (path, body, headers = {}) =>
    fetch(`${baseUrl}/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  const login = (body) => request('/login', { userId: 'healer01', password: PASSWORD, ...body });

  it('로그인에 성공하면 토큰과 user 를 반환하고 실패 횟수를 초기화한다', async () => {
    member().loginFailCount = 3;
    const res = await login();
    assert.equal(res.status, 200);
    const { success, data } = await res.json();
    assert.equal(success, true);
    assert.deepEqual(data.user, {
      id: 1,
      nickname: '빛나는힐러',
      level: 48,
      mannerTemp: 98.4,
      avatarUrl: null,
      online: true,
    });

    const access = jwt.verify(data.accessToken, AUTH.jwtSecret);
    assert.equal(access.typ, 'access');
    assert.equal(access.sub, '1');
    assert.equal(access.exp - access.iat, AUTH.accessTokenTtlSeconds);

    const expectedExpiry = clock.getTime() + AUTH.refreshTokenTtlDays * DAY_MS;
    const refresh = jwt.decode(data.refreshToken);
    assert.equal(refresh.typ, 'refresh');
    assert.equal(refresh.sub, '1');
    assert.equal(refresh.exp * 1000, expectedExpiry);
    assert.ok(refresh.jti);

    const [saved] = repo.state.tokens;
    assert.match(saved.tokenHash, /^[0-9a-f]{64}$/, '원문이 아닌 SHA-256 해시를 저장');
    assert.equal(saved.expiresAt.getTime(), expectedExpiry);

    assert.equal(member().loginFailCount, 0);
    assert.deepEqual(member().lastLoginAt, clock);
  });

  it('rememberMe=true 면 Refresh Token 유효 기간이 길어진다', async () => {
    const res = await login({ rememberMe: true });
    assert.equal(res.status, 200);
    assert.equal(repo.state.tokens[0].expiresAt.getTime(), clock.getTime() + AUTH.rememberMeTtlDays * DAY_MS);
  });

  it('입력이 비었거나 rememberMe 가 boolean 이 아니면 400 INVALID_INPUT', async () => {
    const res = await request('/login', { userId: ' ', rememberMe: 'yes' });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.code, 'INVALID_INPUT');
    assert.deepEqual(error.fields.map((f) => f.field), ['userId', 'password', 'rememberMe']);
  });

  it('없는 아이디와 틀린 비밀번호는 같은 401 INVALID_CREDENTIALS 로 응답한다', async () => {
    for (const body of [{ userId: 'nobody99' }, { password: 'wrong123!' }]) {
      const res = await login(body);
      assert.equal(res.status, 401);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_CREDENTIALS');
      assert.equal(error.message, '아이디 또는 비밀번호가 일치하지 않습니다.');
    }
    assert.equal(member().loginFailCount, 1);
    assert.equal(repo.state.tokens.length, 0);
  });

  it('5회 연속 실패하면 10분 잠기고, 잠금 중에는 맞는 비밀번호도 거부한다', async () => {
    for (let i = 1; i <= 4; i += 1) {
      assert.equal((await login({ password: 'wrong123!' })).status, 401);
    }
    const fifth = await login({ password: 'wrong123!' });
    assert.equal(fifth.status, 403);
    assert.equal((await fifth.json()).error.code, 'ACCOUNT_LOCKED');

    const whileLocked = await login();
    assert.equal(whileLocked.status, 403);
    assert.equal((await whileLocked.json()).error.code, 'ACCOUNT_LOCKED');

    advance(10 * 60 * 1000 + 1);
    assert.equal((await login()).status, 200);
    assert.equal(member().lockedUntil, null);
  });

  it('정지·영구 정지 회원은 비밀번호가 맞아도 403, 정지 기간이 지나면 로그인된다', async () => {
    Object.assign(member(), { status: 'SUSPENDED', suspendedUntil: new Date(clock.getTime() + DAY_MS) });
    const suspended = await login();
    assert.equal(suspended.status, 403);
    assert.equal((await suspended.json()).error.code, 'ACCOUNT_SUSPENDED');

    advance(DAY_MS + 1);
    assert.equal((await login()).status, 200);

    member().status = 'BANNED';
    const banned = await login();
    assert.equal(banned.status, 403);
    assert.equal((await banned.json()).error.code, 'ACCOUNT_BANNED');
  });

  it('정지 회원 로그인 403 응답에 안내 모달용 제재 내용(닉네임·사유·일수·해제 시각)을 싣는다', async () => {
    const startsAt = new Date(clock.getTime() - DAY_MS);
    const endsAt = new Date(startsAt.getTime() + 3 * DAY_MS);
    repo.state.sanctions.push(
      { memberId: 1, type: 'SUSPEND', reason: '이전 정지', startsAt: new Date('2026-10-01T00:00:00Z'), endsAt: new Date('2026-10-02T00:00:00Z'), releasedAt: null },
      { memberId: 1, type: 'SUSPEND', reason: '욕설, 공격적인 언행', startsAt, endsAt, releasedAt: null },
      { memberId: 1, type: 'WARNING', reason: '경고', startsAt, endsAt: null, releasedAt: null },
    );
    Object.assign(member(), { status: 'SUSPENDED', suspendedUntil: endsAt });

    const res = await login();
    assert.equal(res.status, 403);
    const { error } = await res.json();
    assert.equal(error.code, 'ACCOUNT_SUSPENDED');
    assert.deepEqual(error.sanction, {
      type: 'SUSPEND',
      nickname: '빛나는힐러',
      reason: '욕설, 공격적인 언행',
      days: 3,
      endsAt: endsAt.toISOString(),
    });
  });

  it('영구 정지 회원 로그인 403 응답에는 사유만 있고 일수·해제 시각은 null 이다', async () => {
    repo.state.sanctions.push({ memberId: 1, type: 'BAN', reason: '불법 프로그램 사용', startsAt: clock, endsAt: null, releasedAt: null });
    member().status = 'BANNED';

    const { error } = await (await login()).json();
    assert.equal(error.code, 'ACCOUNT_BANNED');
    assert.deepEqual(error.sanction, { type: 'BAN', nickname: '빛나는힐러', reason: '불법 프로그램 사용', days: null, endsAt: null });
  });

  it('제재 기록을 찾지 못해도 403 과 해제 시각은 알려주고 사유·일수는 null 이다', async () => {
    const suspendedUntil = new Date(clock.getTime() + DAY_MS);
    Object.assign(member(), { status: 'SUSPENDED', suspendedUntil });

    const { error } = await (await login()).json();
    assert.equal(error.code, 'ACCOUNT_SUSPENDED');
    assert.deepEqual(error.sanction, { type: 'SUSPEND', nickname: '빛나는힐러', reason: null, days: null, endsAt: suspendedUntil.toISOString() });
  });

  it('정지 회원이라도 비밀번호가 틀리면 제재 여부를 알려주지 않는다', async () => {
    member().status = 'BANNED';
    const res = await login({ password: 'wrong123!' });
    assert.equal(res.status, 401);
    const { error } = await res.json();
    assert.equal(error.code, 'INVALID_CREDENTIALS');
    assert.equal(error.sanction, undefined);
  });

  it('refresh: 새 토큰을 발급하고 이전 Refresh Token 은 더 쓸 수 없다', async () => {
    const { data } = await (await login({ rememberMe: true })).json();
    const firstExpiry = repo.state.tokens[0].expiresAt;

    advance(60 * 1000);
    const res = await request('/refresh', { refreshToken: data.refreshToken });
    assert.equal(res.status, 200);
    const refreshed = (await res.json()).data;
    assert.equal(jwt.verify(refreshed.accessToken, AUTH.jwtSecret).sub, '1');
    assert.notEqual(refreshed.refreshToken, data.refreshToken);
    assert.deepEqual(repo.state.tokens[1].expiresAt, firstExpiry, '처음 로그인 때의 만료 시각 유지');

    const reused = await request('/refresh', { refreshToken: data.refreshToken });
    assert.equal(reused.status, 401);
    assert.equal((await reused.json()).error.code, 'INVALID_REFRESH_TOKEN');
  });

  it('refresh: 없는 토큰·만료된 토큰은 401, 빈 값은 400', async () => {
    const { data } = await (await login()).json();

    assert.equal((await request('/refresh', {})).status, 400);
    assert.equal((await request('/refresh', { refreshToken: 'unknown' })).status, 401);

    advance(AUTH.refreshTokenTtlDays * DAY_MS);
    const expired = await request('/refresh', { refreshToken: data.refreshToken });
    assert.equal(expired.status, 401);
    assert.equal((await expired.json()).error.code, 'INVALID_REFRESH_TOKEN');
  });

  it('refresh: 그 사이 정지된 회원은 403', async () => {
    const { data } = await (await login()).json();
    member().status = 'BANNED';
    const res = await request('/refresh', { refreshToken: data.refreshToken });
    assert.equal(res.status, 403);
    const { error } = await res.json();
    assert.equal(error.code, 'ACCOUNT_BANNED');
    assert.equal(error.sanction, undefined, '재발급 응답에는 제재 내용을 싣지 않음');
  });

  it('logout: Access Token 이 필요하고, 성공하면 204 와 함께 Refresh Token 을 모두 폐기한다', async () => {
    const first = (await (await login()).json()).data;
    const second = (await (await login()).json()).data;

    const noToken = await request('/logout', {});
    assert.equal(noToken.status, 401);
    assert.equal((await noToken.json()).error.code, 'UNAUTHORIZED');

    const res = await request('/logout', {}, { Authorization: `Bearer ${second.accessToken}` });
    assert.equal(res.status, 204);
    assert.ok(repo.state.tokens.every((t) => t.revokedAt));

    for (const { refreshToken } of [first, second]) {
      assert.equal((await request('/refresh', { refreshToken })).status, 401);
    }
  });

  it('logout: 위조되거나 만료된 Access Token 은 401', async () => {
    const forged = jwt.sign({ typ: 'access' }, 'other-secret', { subject: '1', expiresIn: 60 });
    const forgedRes = await request('/logout', {}, { Authorization: `Bearer ${forged}` });
    assert.equal(forgedRes.status, 401);
    assert.equal((await forgedRes.json()).error.code, 'UNAUTHORIZED');

    const expired = jwt.sign({ typ: 'access', exp: Math.floor(Date.now() / 1000) - 10 }, AUTH.jwtSecret, {
      subject: '1',
    });
    const expiredRes = await request('/logout', {}, { Authorization: `Bearer ${expired}` });
    assert.equal(expiredRes.status, 401);
    assert.equal((await expiredRes.json()).error.code, 'TOKEN_EXPIRED');
  });

  it('Access Token 과 Refresh Token 은 서로의 자리에 쓸 수 없다', async () => {
    const { data } = await (await login()).json();

    const refreshAsAccess = await request('/logout', {}, { Authorization: `Bearer ${data.refreshToken}` });
    assert.equal(refreshAsAccess.status, 401);
    assert.equal((await refreshAsAccess.json()).error.code, 'UNAUTHORIZED');

    const accessAsRefresh = await request('/refresh', { refreshToken: data.accessToken });
    assert.equal(accessAsRefresh.status, 401);
    assert.equal((await accessAsRefresh.json()).error.code, 'INVALID_REFRESH_TOKEN');
  });

  it('refresh: 서명이 맞지 않는 Refresh Token 은 DB 에 같은 해시가 있어도 401', async () => {
    const forged = jwt.sign({ typ: 'refresh' }, 'other-secret', { subject: '1', expiresIn: 3600 });
    await repo.saveRefreshToken({
      memberId: 1,
      tokenHash: crypto.createHash('sha256').update(forged).digest('hex'),
      expiresAt: new Date(clock.getTime() + DAY_MS),
    });
    const res = await request('/refresh', { refreshToken: forged });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'INVALID_REFRESH_TOKEN');
  });
});
