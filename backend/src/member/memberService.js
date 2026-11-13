'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../common/ApiError');
const {
  TERMS_VERSION,
  checkTypeColumns,
  duplicateErrors,
  MAX_LOGIN_FAILURES,
  LOGIN_LOCK_MINUTES,
  memberStatus,
  memberMessages,
} = require('./memberConstants');
const {
  validateSignup,
  validateCheckQuery,
  validateLogin,
  validateRefresh,
  validateFindId,
  validateFindPassword,
  validateResetPassword,
} = require('./memberValidator');

/** 존재하지 않는 아이디에도 bcrypt 비교를 한 번 해서, 응답 시간으로 아이디 존재 여부를 알 수 없게 합니다. */
const DUMMY_PASSWORD = 'ourparty-dummy-password';

const invalidCredentials = () => new ApiError(401, 'INVALID_CREDENTIALS', memberMessages.invalidCredentials);
const accountLocked = () => new ApiError(403, 'ACCOUNT_LOCKED', memberMessages.accountLocked);
const invalidRefreshToken = () => new ApiError(401, 'INVALID_REFRESH_TOKEN', memberMessages.invalidRefreshToken);
const memberNotFound = () => new ApiError(404, 'MEMBER_NOT_FOUND', memberMessages.memberNotFound);
const invalidResetToken = () => new ApiError(401, 'INVALID_RESET_TOKEN', memberMessages.invalidResetToken);

/** 제재 중인 회원이면 403 (정지 기간이 지난 SUSPENDED 는 로그인 허용) */
function assertNotSanctioned(member, current) {
  if (member.status === memberStatus.banned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', memberMessages.accountBanned);
  }
  if (member.status === memberStatus.suspended && (!member.suspendedUntil || member.suspendedUntil > current)) {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', memberMessages.accountSuspended);
  }
}

/** 로그인 응답의 user (프론트 `LoggedInUser`, docs/API_SPEC.md 2절) */
const toLoggedInUser = (member) => ({
  id: member.id,
  nickname: member.nickname,
  level: member.level,
  mannerTemp: member.mannerTemp,
  avatarUrl: member.avatarUrl,
  online: true,
});

/** member_withdrawal 의 phone_hash / email_hash 와 같은 방식(SHA-256 hex) */
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const duplicateError = (column) => {
  const { code, message } = duplicateErrors[column];
  return new ApiError(409, code, message);
};

/** 동시에 가입해 사전 확인을 통과한 경우, DB UNIQUE 위반을 409 로 바꿉니다. */
function toDuplicateError(err) {
  if (!err || err.code !== 'ER_DUP_ENTRY') return null;
  const column = Object.keys(duplicateErrors).find((key) =>
    String(err.sqlMessage ?? err.message).includes(duplicateErrors[key].constraint),
  );
  return column ? duplicateError(column) : null;
}

/**
 * 회원가입 · 중복 확인 · 로그인 · 토큰 재발급 · 로그아웃 · 아이디/비밀번호 찾기 비즈니스 로직.
 * @param {{
 *   memberRepository: ReturnType<typeof import('./memberRepository').createMemberRepository>,
 *   tokenProvider: ReturnType<typeof import('../common/tokenProvider').createTokenProvider>,
 *   bcryptRounds: number,
 *   now?: () => Date,
 * }} deps
 */
function createMemberService({ memberRepository, tokenProvider, bcryptRounds, now = () => new Date() }) {
  let dummyHash;
  const getDummyHash = () => (dummyHash ??= bcrypt.hash(DUMMY_PASSWORD, bcryptRounds));

  /** Refresh Token 을 저장하고 Access Token 과 함께 돌려줍니다. */
  async function issueTokens(memberId, refreshToken) {
    await memberRepository.saveRefreshToken({
      memberId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    });
    return { accessToken: tokenProvider.createAccessToken(memberId), refreshToken: refreshToken.token };
  }

  /** GET /api/auth/check */
  async function checkAvailability(query) {
    const { type, value } = validateCheckQuery(query);
    const exists = await memberRepository.existsBy(checkTypeColumns[type], value);
    return { available: !exists };
  }

  /** POST /api/auth/signup */
  async function signup(body) {
    const input = validateSignup(body);
    const current = now();

    const blocked = await memberRepository.hasActiveRejoinBlock({
      phoneHash: sha256(input.phone),
      emailHash: sha256(input.email),
      now: current,
    });
    if (blocked) throw new ApiError(403, 'REJOIN_RESTRICTED', memberMessages.rejoinRestricted);

    const uniqueValues = { login_id: input.userId, nickname: input.nickname, email: input.email, phone: input.phone };
    for (const [column, value] of Object.entries(uniqueValues)) {
      if (await memberRepository.existsBy(column, value)) throw duplicateError(column);
    }

    const passwordHash = await bcrypt.hash(input.password, bcryptRounds);

    let memberId;
    try {
      memberId = await memberRepository.createMember({
        member: { ...input, passwordHash },
        agreements: input.agreements,
        termsVersion: TERMS_VERSION,
        now: current,
      });
    } catch (err) {
      throw toDuplicateError(err) ?? err;
    }

    return { id: memberId, userId: input.userId, nickname: input.nickname };
  }

  /**
   * POST /api/auth/login
   * 순서: 아이디 조회 → 잠금 확인 → 비밀번호 비교(실패 시 횟수 기록) → 제재 확인 → 토큰 발급.
   * 제재 여부는 비밀번호가 맞을 때만 알려줍니다.
   */
  async function login(body) {
    const input = validateLogin(body);
    const current = now();

    const member = await memberRepository.findAuthMemberByLoginId(input.userId);
    if (!member || !member.passwordHash) {
      await bcrypt.compare(input.password, await getDummyHash());
      throw invalidCredentials();
    }

    if (member.lockedUntil && member.lockedUntil > current) throw accountLocked();

    if (!(await bcrypt.compare(input.password, member.passwordHash))) {
      await memberRepository.recordLoginFailure({
        memberId: member.id,
        maxFailures: MAX_LOGIN_FAILURES,
        lockedUntil: new Date(current.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000),
      });
      throw member.loginFailCount + 1 >= MAX_LOGIN_FAILURES ? accountLocked() : invalidCredentials();
    }

    assertNotSanctioned(member, current);

    await memberRepository.recordLoginSuccess({ memberId: member.id, now: current });
    const refreshToken = tokenProvider.createRefreshToken({
      memberId: member.id,
      rememberMe: input.rememberMe,
      now: current,
    });
    const tokens = await issueTokens(member.id, refreshToken);
    return { ...tokens, user: toLoggedInUser(member) };
  }

  /**
   * POST /api/auth/refresh
   * JWT 서명·만료·종류를 검증한 뒤, DB 에서 폐기되지 않은 토큰인지 확인합니다.
   * 사용한 Refresh Token 은 폐기하고 새로 발급합니다(rotation). 만료 시각은 처음 로그인 때 정한 값을 유지합니다.
   */
  async function refresh(body) {
    const { refreshToken } = validateRefresh(body);
    const current = now();

    let memberId;
    try {
      ({ memberId } = tokenProvider.verifyRefreshToken(refreshToken, current));
    } catch {
      throw invalidRefreshToken();
    }

    const stored = await memberRepository.findRefreshToken(tokenProvider.hashToken(refreshToken));
    if (!stored || stored.memberId !== memberId || stored.revokedAt || stored.expiresAt <= current) {
      throw invalidRefreshToken();
    }
    // 같은 토큰으로 동시에 요청하면 먼저 폐기한 쪽만 성공
    if (!(await memberRepository.revokeRefreshToken({ id: stored.id, now: current }))) throw invalidRefreshToken();

    const member = await memberRepository.findAuthMemberById(stored.memberId);
    if (!member || member.status === memberStatus.withdrawn) throw invalidRefreshToken();
    assertNotSanctioned(member, current);

    const next = tokenProvider.createRefreshToken({ memberId: member.id, now: current, expiresAt: stored.expiresAt });
    return issueTokens(member.id, next);
  }

  /** POST /api/auth/logout — 회원의 Refresh Token 을 모두 폐기합니다 (docs/03-db-design.md 인덱스 표). */
  async function logout(memberId) {
    await memberRepository.revokeAllRefreshTokens({ memberId, now: now() });
  }

  /** POST /api/auth/find-id — 닉네임·이메일이 모두 일치하는 회원의 아이디 */
  async function findId(body) {
    const input = validateFindId(body);
    const userId = await memberRepository.findLoginIdByNicknameAndEmail(input);
    if (!userId) throw memberNotFound();
    return { userId };
  }

  /** POST /api/auth/find-password — 아이디·이메일이 모두 일치하면 재설정 토큰 발급 */
  async function findPassword(body) {
    const input = validateFindPassword(body);
    const current = now();
    const memberId = await memberRepository.findMemberIdByLoginIdAndEmail({ loginId: input.userId, email: input.email });
    if (!memberId) throw memberNotFound();

    const { token, tokenHash, expiresAt } = tokenProvider.createPasswordResetToken({ memberId, now: current });
    await memberRepository.savePasswordResetToken({ memberId, tokenHash, expiresAt });
    return { resetToken: token, expiresAt: expiresAt.toISOString() };
  }

  /** POST /api/auth/reset-password — 재설정 토큰은 한 번만 쓸 수 있습니다. */
  async function resetPassword(body) {
    const { resetToken, newPassword } = validateResetPassword(body);
    const current = now();

    let memberId;
    try {
      ({ memberId } = tokenProvider.verifyPasswordResetToken(resetToken, current));
    } catch {
      throw invalidResetToken();
    }

    const stored = await memberRepository.findPasswordResetToken(tokenProvider.hashToken(resetToken));
    if (!stored || stored.memberId !== memberId || stored.usedAt || stored.expiresAt <= current) {
      throw invalidResetToken();
    }

    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
    const reset = await memberRepository.resetPassword({ tokenId: stored.id, memberId, passwordHash, now: current });
    if (!reset) throw invalidResetToken();
  }

  return { checkAvailability, signup, login, refresh, logout, findId, findPassword, resetPassword };
}

module.exports = { createMemberService };
