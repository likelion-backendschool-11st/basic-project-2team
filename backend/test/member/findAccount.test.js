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

/** email_verification 가짜 repository */
function createFakeEmailVerificationRepository() {
  const state = { rows: [] };
  const byId = (id) => state.rows.find((r) => r.id === id);
  return {
    state,
    async findLatestByEmail(email) {
      const rows = state.rows.filter((r) => r.email === email);
      return snapshot(rows[rows.length - 1]);
    },
    async create({ email, codeHash, expiresAt, now }) {
      state.rows.push({
        id: state.rows.length + 1,
        email,
        codeHash,
        attemptCount: 0,
        expiresAt,
        verifiedAt: null,
        createdAt: now,
      });
    },
    async reserveAttempt({ id, maxAttempts }) {
      const row = byId(id);
      if (row.attemptCount >= maxAttempts) return false;
      row.attemptCount += 1;
      return true;
    },
    async markVerified({ id, now }) {
      byId(id).verifiedAt ??= now;
    },
  };
}

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
  let emailRepo;
  let memberRepo;
  let clock;
  /** 가짜 메일함: 보낸 메일 목록 */
  let outbox;
  let mailFails;

  before(async () => {
    emailRepo = createFakeEmailVerificationRepository();
    memberRepo = createFakeMemberRepository();
    const mailer = {
      async sendMail(message) {
        if (mailFails) throw new Error('SMTP down');
        outbox.push(message);
      },
    };
    const app = createApp({
      memberRepository: memberRepo,
      emailVerificationRepository: emailRepo,
      mailer,
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
    outbox = [];
    mailFails = false;
    emailRepo.state.rows.length = 0;
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
  const lastCode = () => /인증코드: (\d{6})/.exec(outbox[outbox.length - 1].text)[1];

  /** 인증코드 발송 → 확인까지 마치고 이메일 인증 토큰을 돌려줍니다. */
  async function verifyEmail(email = EMAIL) {
    assert.equal((await post('/email/send', { email })).status, 200);
    const res = await post('/email/verify', { email, code: lastCode() });
    assert.equal(res.status, 200);
    return (await res.json()).data.verificationToken;
  }

  describe('이메일 인증', () => {
    it('인증코드를 메일로 보내고, 코드는 해시로만 저장한다', async () => {
      const res = await post('/email/send', { email: ' Healer@Example.com ' });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { success: true, data: { expiresInSeconds: 300 } });

      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].to, EMAIL);
      const [row] = emailRepo.state.rows;
      assert.equal(row.email, EMAIL);
      assert.match(row.codeHash, /^[0-9a-f]{64}$/);
      assert.ok(!row.codeHash.includes(lastCode()));
    });

    it('맞는 코드면 이메일 인증 토큰(JWT)을 발급한다', async () => {
      await post('/email/send', { email: EMAIL });
      const res = await post('/email/verify', { email: EMAIL, code: lastCode() });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.verified, true);

      const payload = jwt.verify(data.verificationToken, AUTH.jwtSecret, { clockTimestamp: clock.getTime() / 1000 });
      assert.equal(payload.typ, 'email_verification');
      assert.equal(payload.sub, EMAIL);
      assert.equal(data.expiresAt, new Date(clock.getTime() + 15 * MINUTE_MS).toISOString());
      assert.ok(emailRepo.state.rows[0].verifiedAt);
    });

    it('60초 안에 다시 요청하면 429, 지나면 새 코드를 보내고 이전 코드는 무효', async () => {
      await post('/email/send', { email: EMAIL });
      const firstCode = lastCode();

      const tooSoon = await post('/email/send', { email: EMAIL });
      assert.equal(tooSoon.status, 429);
      assert.equal((await tooSoon.json()).error.code, 'EMAIL_SEND_TOO_FREQUENT');

      advance(60 * 1000);
      assert.equal((await post('/email/send', { email: EMAIL })).status, 200);
      if (lastCode() !== firstCode) {
        const res = await post('/email/verify', { email: EMAIL, code: firstCode });
        assert.equal((await res.json()).error.code, 'INVALID_VERIFICATION_CODE');
      }
      assert.equal((await post('/email/verify', { email: EMAIL, code: lastCode() })).status, 200);
    });

    it('틀린 코드는 400, 5번 시도하면 맞는 코드도 429', async () => {
      await post('/email/send', { email: EMAIL });
      const wrong = lastCode() === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i += 1) {
        const res = await post('/email/verify', { email: EMAIL, code: wrong });
        assert.equal(res.status, 400);
        assert.equal((await res.json()).error.code, 'INVALID_VERIFICATION_CODE');
      }
      const res = await post('/email/verify', { email: EMAIL, code: lastCode() });
      assert.equal(res.status, 429);
      assert.equal((await res.json()).error.code, 'VERIFICATION_ATTEMPTS_EXCEEDED');
    });

    it('5분이 지났거나 보낸 적이 없으면 400 VERIFICATION_CODE_EXPIRED', async () => {
      const never = await post('/email/verify', { email: EMAIL, code: '123456' });
      assert.equal((await never.json()).error.code, 'VERIFICATION_CODE_EXPIRED');

      await post('/email/send', { email: EMAIL });
      advance(5 * MINUTE_MS);
      const res = await post('/email/verify', { email: EMAIL, code: lastCode() });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'VERIFICATION_CODE_EXPIRED');
    });

    it('이메일·코드 형식이 틀리면 400 INVALID_INPUT', async () => {
      const send = await post('/email/send', { email: 'not-an-email' });
      assert.equal(send.status, 400);

      const res = await post('/email/verify', { email: '', code: '12ab' });
      const { error } = await res.json();
      assert.equal(error.code, 'INVALID_INPUT');
      assert.deepEqual(error.fields.map((f) => f.field), ['email', 'code']);
    });

    it('메일 발송에 실패하면 502 EMAIL_SEND_FAILED 이고 코드를 저장하지 않는다', async (t) => {
      t.mock.method(console, 'error', () => {});
      mailFails = true;
      const res = await post('/email/send', { email: EMAIL });
      assert.equal(res.status, 502);
      assert.equal((await res.json()).error.code, 'EMAIL_SEND_FAILED');
      assert.equal(emailRepo.state.rows.length, 0);
    });
  });

  describe('아이디 찾기', () => {
    it('이메일 인증 후 닉네임·이메일이 맞으면 아이디를 알려준다', async () => {
      const verificationToken = await verifyEmail();
      const res = await post('/find-id', { nickname: '빛나는힐러', email: 'HEALER@example.com', verificationToken });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { success: true, data: { userId: 'healer01' } });
    });

    it('일치하는 회원이 없으면 404 MEMBER_NOT_FOUND', async () => {
      const verificationToken = await verifyEmail();
      const res = await post('/find-id', { nickname: '다른닉네임', email: EMAIL, verificationToken });
      assert.equal(res.status, 404);
      assert.equal((await res.json()).error.code, 'MEMBER_NOT_FOUND');
    });

    it('인증 토큰이 없으면 400, 다른 이메일로 받은 토큰·만료된 토큰은 401 EMAIL_NOT_VERIFIED', async () => {
      const missing = await post('/find-id', { nickname: '빛나는힐러', email: EMAIL });
      assert.equal(missing.status, 400);
      assert.equal((await missing.json()).error.fields[0].field, 'verificationToken');

      const otherToken = await verifyEmail('attacker@example.com');
      const other = await post('/find-id', { nickname: '빛나는힐러', email: EMAIL, verificationToken: otherToken });
      assert.equal(other.status, 401);
      assert.equal((await other.json()).error.code, 'EMAIL_NOT_VERIFIED');

      const token = await verifyEmail();
      advance(15 * MINUTE_MS);
      const expired = await post('/find-id', { nickname: '빛나는힐러', email: EMAIL, verificationToken: token });
      assert.equal(expired.status, 401);
      assert.equal((await expired.json()).error.code, 'EMAIL_NOT_VERIFIED');
    });
  });

  describe('비밀번호 찾기 · 재설정', () => {
    async function issueResetToken() {
      const verificationToken = await verifyEmail();
      const res = await post('/find-password', { userId: 'healer01', email: EMAIL, verificationToken });
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

    it('15분이 지난 재설정 토큰, 위조 토큰, 이메일 인증 토큰은 401 INVALID_RESET_TOKEN', async () => {
      const { resetToken } = await issueResetToken();
      const verificationToken = await verifyEmail('someone@example.com');
      const forged = jwt.sign({ typ: 'password_reset' }, 'other-secret', { subject: '1', expiresIn: 600 });

      advance(15 * MINUTE_MS);
      for (const token of [resetToken, forged, verificationToken]) {
        const res = await post('/reset-password', { resetToken: token, newPassword: NEW_PASSWORD });
        assert.equal(res.status, 401);
        assert.equal((await res.json()).error.code, 'INVALID_RESET_TOKEN');
      }
      assert.ok(await bcrypt.compare(OLD_PASSWORD, memberRepo.state.members[0].passwordHash));
    });

    it('아이디·이메일이 일치하지 않으면 404, 인증 안 된 이메일이면 401', async () => {
      const verificationToken = await verifyEmail();
      const wrongId = await post('/find-password', { userId: 'nobody99', email: EMAIL, verificationToken });
      assert.equal(wrongId.status, 404);
      assert.equal((await wrongId.json()).error.code, 'MEMBER_NOT_FOUND');

      const notVerified = await post('/find-password', {
        userId: 'healer01',
        email: EMAIL,
        verificationToken: 'not-a-token',
      });
      assert.equal(notVerified.status, 401);
      assert.equal((await notVerified.json()).error.code, 'EMAIL_NOT_VERIFIED');
      assert.equal(memberRepo.state.resetTokens.length, 0);
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
