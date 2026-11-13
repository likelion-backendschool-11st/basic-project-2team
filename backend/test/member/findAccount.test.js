'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const EMAIL = 'healer@example.com';
const OLD_PASSWORD = 'abc123!@';
const NEW_PASSWORD = 'new456#x';
const MINUTE_MS = 60 * 1000;

/** 조회 시점의 복사본을 돌려줘 실제 DB 처럼 동작하게 합니다. */
const snapshot = (row) => (row ? { ...row } : null);

/** 아이디/비밀번호 찾기에 필요한 member 가짜 repository */
function createFakeMemberRepository() {
  const state = { members: [], resetTokens: [], refreshTokens: [] };
  return {
    state,
    async findLoginIdByNicknameAndEmail({ nickname, email }) {
      return state.members.find((m) => m.nickname === nickname && m.email === email)?.loginId ?? null;
    },
    async findMemberIdByLoginIdAndEmail({ loginId, email }) {
      return state.members.find((m) => m.loginId === loginId && m.email === email)?.id ?? null;
    },
    async savePasswordResetToken({ memberId, tokenHash, expiresAt }) {
      state.resetTokens.push({ id: state.resetTokens.length + 1, memberId, tokenHash, expiresAt, usedAt: null });
    },
    async findPasswordResetToken(tokenHash) {
      return snapshot(state.resetTokens.find((t) => t.tokenHash === tokenHash));
    },
    async resetPassword({ tokenId, memberId, passwordHash, now }) {
      const token = state.resetTokens.find((t) => t.id === tokenId);
      if (token.usedAt) return false;
      Object.assign(
        state.members.find((m) => m.id === memberId),
        { passwordHash, loginFailCount: 0, lockedUntil: null },
      );
      for (const t of state.resetTokens) if (t.memberId === memberId && !t.usedAt) t.usedAt = now;
      for (const t of state.refreshTokens) if (t.memberId === memberId && !t.revokedAt) t.revokedAt = now;
      return true;
    },
  };
}

describe('아이디/비밀번호 찾기 API', () => {
  let server;
  let baseUrl;
  let memberRepo;
  let clock;

  before(async () => {
    memberRepo = createFakeMemberRepository();
    const app = createApp({
      memberRepository: memberRepo,
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

  beforeEach(async () => {
    clock = new Date('2026-11-13T00:00:00Z');
    memberRepo.state.resetTokens.length = 0;
    memberRepo.state.refreshTokens.length = 0;
    memberRepo.state.members.length = 0;
    memberRepo.state.members.push({
      id: 1,
      loginId: 'healer01',
      nickname: '빛나는힐러',
      email: EMAIL,
      passwordHash: await bcrypt.hash(OLD_PASSWORD, 4),
      loginFailCount: 3,
      lockedUntil: new Date(clock.getTime() + 5 * MINUTE_MS),
    });
  });

  const advance = (ms) => {
    clock = new Date(clock.getTime() + ms);
  };
  const post = (path, body) =>
    fetch(`${baseUrl}/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  describe('아이디 찾기', () => {
    it('닉네임·이메일이 일치하면 아이디를 알려준다 (이메일 대소문자·앞뒤 공백 무시)', async () => {
      const res = await post('/find-id', { nickname: '빛나는힐러', email: ' HEALER@example.com ' });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { success: true, data: { userId: 'healer01' } });
    });

    it('닉네임 또는 이메일이 일치하지 않으면 404 MEMBER_NOT_FOUND', async () => {
      for (const body of [
        { nickname: '다른닉네임', email: EMAIL },
        { nickname: '빛나는힐러', email: 'other@example.com' },
      ]) {
        const res = await post('/find-id', body);
        assert.equal(res.status, 404);
        assert.equal((await res.json()).error.code, 'MEMBER_NOT_FOUND');
      }
    });

    it('닉네임이 비었거나 이메일 형식이 틀리면 400 INVALID_INPUT', async () => {
      const res = await post('/find-id', { nickname: '', email: 'not-an-email' });
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.deepEqual(error.fields.map((f) => f.field), ['nickname', 'email']);
    });
  });

  describe('비밀번호 찾기 · 재설정', () => {
    async function issueResetToken() {
      const res = await post('/find-password', { userId: 'healer01', email: EMAIL });
      assert.equal(res.status, 200);
      return (await res.json()).data;
    }

    it('재설정하면 비밀번호가 바뀌고, 잠금·로그인 기기·남은 재설정 토큰이 모두 정리된다', async () => {
      memberRepo.state.refreshTokens.push({ memberId: 1, revokedAt: null });
      const { resetToken, expiresAt } = await issueResetToken();
      assert.equal(jwt.decode(resetToken).typ, 'password_reset');
      assert.equal(expiresAt, new Date(clock.getTime() + 15 * MINUTE_MS).toISOString());
      assert.match(memberRepo.state.resetTokens[0].tokenHash, /^[0-9a-f]{64}$/);

      const res = await post('/reset-password', { resetToken, newPassword: NEW_PASSWORD });
      assert.equal(res.status, 204);

      const [member] = memberRepo.state.members;
      assert.ok(await bcrypt.compare(NEW_PASSWORD, member.passwordHash));
      assert.equal(member.loginFailCount, 0);
      assert.equal(member.lockedUntil, null);
      assert.ok(memberRepo.state.refreshTokens.every((t) => t.revokedAt));
    });

    it('재설정 토큰은 한 번만 쓸 수 있다', async () => {
      const { resetToken } = await issueResetToken();
      assert.equal((await post('/reset-password', { resetToken, newPassword: NEW_PASSWORD })).status, 204);

      const again = await post('/reset-password', { resetToken, newPassword: 'again789!' });
      assert.equal(again.status, 401);
      assert.equal((await again.json()).error.code, 'INVALID_RESET_TOKEN');
    });

    it('15분이 지난 재설정 토큰, 위조 토큰, 다른 종류의 토큰은 401 INVALID_RESET_TOKEN', async () => {
      const { resetToken } = await issueResetToken();
      const forged = jwt.sign({ typ: 'password_reset' }, 'other-secret', { subject: '1', expiresIn: 600 });
      const accessToken = jwt.sign({ typ: 'access' }, AUTH.jwtSecret, { subject: '1', expiresIn: 3600 });

      advance(15 * MINUTE_MS);
      for (const token of [resetToken, forged, accessToken]) {
        const res = await post('/reset-password', { resetToken: token, newPassword: NEW_PASSWORD });
        assert.equal(res.status, 401);
        assert.equal((await res.json()).error.code, 'INVALID_RESET_TOKEN');
      }
      assert.ok(await bcrypt.compare(OLD_PASSWORD, memberRepo.state.members[0].passwordHash));
    });

    it('아이디·이메일이 일치하지 않으면 404 MEMBER_NOT_FOUND 이고 재설정 토큰을 발급하지 않는다', async () => {
      for (const body of [
        { userId: 'nobody99', email: EMAIL },
        { userId: 'healer01', email: 'other@example.com' },
      ]) {
        const res = await post('/find-password', body);
        assert.equal(res.status, 404);
        assert.equal((await res.json()).error.code, 'MEMBER_NOT_FOUND');
      }
      assert.equal(memberRepo.state.resetTokens.length, 0);
    });

    it('아이디·이메일이 비어 있으면 400 INVALID_INPUT', async () => {
      const res = await post('/find-password', {});
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.deepEqual(error.fields.map((f) => f.field), ['userId', 'email']);
    });

    it('새 비밀번호가 규칙에 맞지 않으면 400 INVALID_INPUT', async () => {
      const { resetToken } = await issueResetToken();
      const res = await post('/reset-password', { resetToken, newPassword: 'short1!' });
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.equal(error.fields[0].field, 'newPassword');
    });
  });
});
