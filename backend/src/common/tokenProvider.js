'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const DAY_MS = 24 * 60 * 60 * 1000;

/** JWT 의 typ 클레임. Refresh Token 을 Access Token 자리에 쓰지 못하게 구분합니다. */
const tokenTypes = Object.freeze({ access: 'access', refresh: 'refresh' });

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
   * 토큰 서명·만료·종류를 검증하고 회원 id 를 돌려줍니다.
   * @param {Date} [now] 만료 판단 기준 시각 (생략하면 현재 시각)
   * @returns {{ memberId: number }}
   * @throws {Error & { expired: boolean }} 만료, 위조, 형식 오류, 종류 불일치
   */
  function verify(type, token, now) {
    try {
      const payload = jwt.verify(token, jwtSecret, {
        algorithms: [ALGORITHM],
        clockTimestamp: now && toSeconds(now),
      });
      if (payload.typ !== type) throw new Error(`expected ${type} token`);
      const memberId = Number(payload.sub);
      if (!Number.isSafeInteger(memberId) || memberId <= 0) throw new Error('invalid subject');
      return { memberId };
    } catch (err) {
      const error = new Error(`invalid ${type} token`, { cause: err });
      error.expired = err instanceof jwt.TokenExpiredError;
      throw error;
    }
  }

  function createAccessToken(memberId) {
    return jwt.sign({ typ: tokenTypes.access }, jwtSecret, {
      algorithm: ALGORITHM,
      subject: String(memberId),
      expiresIn: accessTokenTtlSeconds,
    });
  }

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
    createAccessToken,
    verifyAccessToken: (token) => verify(tokenTypes.access, token),
    createRefreshToken,
    verifyRefreshToken: (token, now) => verify(tokenTypes.refresh, token, now),
    hashToken,
  };
}

module.exports = { createTokenProvider };
