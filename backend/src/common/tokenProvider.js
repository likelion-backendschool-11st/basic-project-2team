'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const DAY_MS = 24 * 60 * 60 * 1000;
/** 이메일 인증 완료 토큰 유효 시간: 인증 후 이 시간 안에 아이디 찾기·비밀번호 찾기를 마쳐야 합니다. */
const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = 15 * 60;
/** 비밀번호 재설정 토큰 유효 시간 (REQ-LOGIN-007) */
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;

/** JWT 의 typ 클레임. 토큰을 다른 용도의 자리에 쓰지 못하게 구분합니다. */
const tokenTypes = Object.freeze({
  access: 'access',
  refresh: 'refresh',
  emailVerification: 'email_verification',
  passwordReset: 'password_reset',
});

const toSeconds = (date) => Math.floor(date.getTime() / 1000);

/** refresh_token · password_reset_token 의 token_hash (CHAR(64)) 에 저장하는 SHA-256 hex */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** sub 에 담긴 회원 id 를 숫자로 꺼냅니다. */
function toMemberId(sub) {
  const memberId = Number(sub);
  if (!Number.isSafeInteger(memberId) || memberId <= 0) throw new Error('invalid subject');
  return memberId;
}

/**
 * 인증에 쓰는 JWT(HS256) 를 만들고 검증합니다.
 * - access / refresh: 로그인 (refresh 는 폐기를 위해 DB 에 해시 저장)
 * - email_verification: 이메일 인증 완료 증명 (sub = 이메일)
 * - password_reset: 비밀번호 재설정 (한 번만 쓰도록 DB 에 해시 저장)
 * @param {{ jwtSecret: string, accessTokenTtlSeconds: number, refreshTokenTtlDays: number, rememberMeTtlDays: number }} authConfig
 */
function createTokenProvider({ jwtSecret, accessTokenTtlSeconds, refreshTokenTtlDays, rememberMeTtlDays }) {
  /**
   * 토큰 서명·만료·종류를 검증하고 subject(회원 또는 관리자 id)를 돌려줍니다.
   * @param {Date} [now] 만료 판단 기준 시각 (생략하면 현재 시각)
   * @returns {number}
   * 서명 시각(now)을 기준으로 JWT 를 만듭니다. jti 를 무작위로 넣어 같은 초에 발급해도 토큰이 겹치지 않게 합니다.
   * @returns {{ token: string, expiresAt: Date }}
   */
  function sign(type, subject, { now = new Date(), expiresAt }) {
    const exp = toSeconds(expiresAt);
    const token = jwt.sign({ typ: type, iat: toSeconds(now), exp }, jwtSecret, {
      algorithm: ALGORITHM,
      subject: String(subject),
      jwtid: crypto.randomUUID(),
    });
    return { token, expiresAt: new Date(exp * 1000) };
  }

  /**
   * 토큰 서명·만료·종류를 검증하고 sub 를 돌려줍니다.
   * @param {Date} [now] 만료 판단 기준 시각 (생략하면 현재 시각)
   * @throws {Error & { expired: boolean }} 만료, 위조, 형식 오류, 종류 불일치
   */
  function verify(type, token, now) {
    try {
      const payload = jwt.verify(token, jwtSecret, {
        algorithms: [ALGORITHM],
        clockTimestamp: now && toSeconds(now),
      });
      if (payload.typ !== type) throw new Error(`expected ${type} token`);
      const subject = Number(payload.sub);
      if (!Number.isSafeInteger(subject) || subject <= 0) throw new Error('invalid subject');
      return subject;
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('missing subject');
      return payload.sub;
    } catch (err) {
      const error = new Error(`invalid ${type} token`, { cause: err });
      error.expired = err instanceof jwt.TokenExpiredError;
      throw error;
    }
  }

  const signAccess = (type, subject) =>
    jwt.sign({ typ: type }, jwtSecret, {
      algorithm: ALGORITHM,
      subject: String(subject),
      expiresIn: accessTokenTtlSeconds,
    });
  /** verify 후 sub 를 회원 id 로 바꿉니다. 형식이 틀리면 verify 와 같은 형태로 throw 합니다. */
  function verifyMemberToken(type, token, now) {
    const sub = verify(type, token, now);
    try {
      return { memberId: toMemberId(sub) };
    } catch (err) {
      throw Object.assign(new Error(`invalid ${type} token`, { cause: err }), { expired: false });
    }
  }

  /** DB 에 해시를 저장하는 토큰: 원문·해시·만료 시각 */
  function withHash({ token, expiresAt }) {
    return { token, tokenHash: hashToken(token), expiresAt };
  }

  function createAccessToken(memberId) {
    const now = new Date();
    return sign(tokenTypes.access, memberId, {
      now,
      expiresAt: new Date(now.getTime() + accessTokenTtlSeconds * 1000),
    }).token;
  }

  /**
   * 새 Refresh Token 과 DB 에 저장할 해시·만료 시각.
   * expiresAt 을 주면(재발급) 그 시각을, 아니면 rememberMe 에 따른 유효 기간을 씁니다.
   */
  function createRefreshToken({ memberId, rememberMe = false, now, expiresAt }) {
    const days = rememberMe ? rememberMeTtlDays : refreshTokenTtlDays;
    return withHash(
      sign(tokenTypes.refresh, memberId, { now, expiresAt: expiresAt ?? new Date(now.getTime() + days * DAY_MS) }),
    );
  }

  /** 이메일 인증을 마쳤다는 증명. 아이디 찾기·비밀번호 찾기 요청에 함께 보냅니다. */
  function createEmailVerificationToken({ email, now }) {
    return sign(tokenTypes.emailVerification, email, {
      now,
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1000),
    });
  }

  function createPasswordResetToken({ memberId, now }) {
    return withHash(
      sign(tokenTypes.passwordReset, memberId, {
        now,
        expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000),
      }),
    );
  }

  return {
    createAccessToken: (memberId) => signAccess(tokenTypes.access, memberId),
    verifyAccessToken: (token) => ({ memberId: verify(tokenTypes.access, token) }),
    createRefreshToken,
    verifyRefreshToken: (token, now) => ({ memberId: verify(tokenTypes.refresh, token, now) }),
    /** 관리자 Access Token. Refresh Token 없이 만료되면 다시 로그인합니다. */
    createAdminAccessToken: (adminId) => signAccess(tokenTypes.admin, adminId),
    verifyAdminAccessToken: (token) => ({ adminId: verify(tokenTypes.admin, token) }),
    createAccessToken,
    verifyAccessToken: (token) => verifyMemberToken(tokenTypes.access, token),
    createRefreshToken,
    verifyRefreshToken: (token, now) => verifyMemberToken(tokenTypes.refresh, token, now),
    createEmailVerificationToken,
    /** @returns {{ email: string }} */
    verifyEmailVerificationToken: (token, now) => ({ email: verify(tokenTypes.emailVerification, token, now) }),
    createPasswordResetToken,
    verifyPasswordResetToken: (token, now) => verifyMemberToken(tokenTypes.passwordReset, token, now),
    hashToken,
  };
}

module.exports = { createTokenProvider };
