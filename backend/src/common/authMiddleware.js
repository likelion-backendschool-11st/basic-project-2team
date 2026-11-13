'use strict';

const { ApiError } = require('./ApiError');

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

const authMessages = Object.freeze({
  unauthorized: '로그인이 필요합니다.',
  tokenExpired: '로그인이 만료되었습니다. 다시 로그인해주세요.',
});

/** Access Token 을 검증해 `{ memberId }` 를 돌려줍니다. 실패하면 401 ApiError 를 throw 합니다. */
function verifyBearerToken(tokenProvider, token) {
  try {
    return tokenProvider.verifyAccessToken(token);
  } catch (err) {
    throw err.expired
      ? new ApiError(401, 'TOKEN_EXPIRED', authMessages.tokenExpired)
      : new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);
  }
}

/**
 * 🔒 로그인 필요 API 앞에 붙이는 미들웨어.
 * `Authorization: Bearer {accessToken}` 을 검증하고 `req.auth = { memberId }` 를 채웁니다.
 * @param {ReturnType<typeof import('./tokenProvider').createTokenProvider>} tokenProvider
 */
function createRequireAuth(tokenProvider) {
  return function requireAuth(req, res, next) {
    const match = BEARER_PATTERN.exec(req.get('Authorization') ?? '');
    if (!match) throw new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);
    req.auth = verifyBearerToken(tokenProvider, match[1]);
    return next();
  };
}

/**
 * 비로그인도 쓸 수 있지만 로그인하면 응답이 달라지는 API (예: 공고 상세) 앞에 붙이는 미들웨어.
 * - Authorization 헤더가 없으면 `req.auth = null` 로 통과합니다.
 * - 헤더가 있는데 토큰이 틀리거나 만료됐으면 401 을 보내 프론트가 토큰을 재발급하게 합니다.
 * @param {ReturnType<typeof import('./tokenProvider').createTokenProvider>} tokenProvider
 */
function createOptionalAuth(tokenProvider) {
  return function optionalAuth(req, res, next) {
    const header = req.get('Authorization');
    if (!header) {
      req.auth = null;
      return next();
    }
    const match = BEARER_PATTERN.exec(header);
    if (!match) throw new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);
    req.auth = verifyBearerToken(tokenProvider, match[1]);
    return next();
  };
}

module.exports = { createRequireAuth, createOptionalAuth };
