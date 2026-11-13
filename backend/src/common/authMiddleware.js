'use strict';

const { ApiError } = require('./ApiError');

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

const authMessages = Object.freeze({
  unauthorized: '로그인이 필요합니다.',
  tokenExpired: '로그인이 만료되었습니다. 다시 로그인해주세요.',
});

/**
 * 🔒 로그인 필요 API 앞에 붙이는 미들웨어.
 * `Authorization: Bearer {accessToken}` 을 검증하고 `req.auth = { memberId }` 를 채웁니다.
 * @param {ReturnType<typeof import('./tokenProvider').createTokenProvider>} tokenProvider
 */
function createRequireAuth(tokenProvider) {
  return function requireAuth(req, res, next) {
    const match = BEARER_PATTERN.exec(req.get('Authorization') ?? '');
    if (!match) throw new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);

    try {
      req.auth = tokenProvider.verifyAccessToken(match[1]);
    } catch (err) {
      throw err.expired
        ? new ApiError(401, 'TOKEN_EXPIRED', authMessages.tokenExpired)
        : new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);
    }
    return next();
  };
}

module.exports = { createRequireAuth };
