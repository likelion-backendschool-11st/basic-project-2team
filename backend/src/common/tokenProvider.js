'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * JWT 의 typ 클레임. Refresh Token 을 Access Token 자리에 쓰지 못하게 구분합니다.
 * 관리자 계정(admin_account)은 회원과 id 가 겹치므로 admin 타입으로 따로 발급합니다.
 */
const tokenTypes = Object.freeze({ access: 'access', refresh: 'refresh', admin: 'admin' });

const toSeconds = (date) => Math.floor(date.getTime() / 1000);

/** refresh_token.token_hash (CHAR(64)) 에 저장하는 SHA-256 hex */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Access Token · Refresh Token 을 JWT(HS256) 로 만들고 검증합니다.
 * Refresh Token 은 폐기(로그아웃·재발급)를 위해 DB 에 해시를 함께 저장합니다 (docs/03-db-design.md).
 * @param {{ jwtSecret: string, accessTokenTtlSeconds: number, refreshTokenTtlDays: number, rememberMeTtlDays: number }} authConfig
 */
function createTokenProvider({ jwtSecret, accessTokenTtlSeconds, refreshTokenTtlDays, rememberMeTtlDays }) {
  /**
   * 토큰 서명·만료·종류를 검증하고 subject(회원 또는 관리자 id)를 돌려줍니다.
   * @param {Date} [now] 만료 판단 기준 시각 (생략하면 현재 시각)
   * @returns {number}
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

  /**
   * 새 Refresh Token(JWT) 과 DB 에 저장할 해시·만료 시각.
   * expiresAt 을 주면(재발급) 그 시각을, 아니면 rememberMe 에 따른 유효 기간을 씁니다.
   * jti 를 무작위로 넣어 같은 초에 발급해도 토큰(해시)이 겹치지 않게 합니다.
   */
  function createRefreshToken({ memberId, rememberMe = false, now, expiresAt }) {
    const days = rememberMe ? rememberMeTtlDays : refreshTokenTtlDays;
    const exp = toSeconds(expiresAt ?? new Date(now.getTime() + days * DAY_MS));
    const token = jwt.sign({ typ: tokenTypes.refresh, iat: toSeconds(now), exp }, jwtSecret, {
      algorithm: ALGORITHM,
      subject: String(memberId),
      jwtid: crypto.randomUUID(),
    });
    return { token, tokenHash: hashToken(token), expiresAt: new Date(exp * 1000) };
  }

  return {
    createAccessToken: (memberId) => signAccess(tokenTypes.access, memberId),
    verifyAccessToken: (token) => ({ memberId: verify(tokenTypes.access, token) }),
    createRefreshToken,
    verifyRefreshToken: (token, now) => ({ memberId: verify(tokenTypes.refresh, token, now) }),
    /** 관리자 Access Token. Refresh Token 없이 만료되면 다시 로그인합니다. */
    createAdminAccessToken: (adminId) => signAccess(tokenTypes.admin, adminId),
    verifyAdminAccessToken: (token) => ({ adminId: verify(tokenTypes.admin, token) }),
    hashToken,
  };
}

module.exports = { createTokenProvider };
