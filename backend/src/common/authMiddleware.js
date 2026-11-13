'use strict';

const { ApiError } = require('./ApiError');

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

const authMessages = Object.freeze({
  unauthorized: '로그인이 필요합니다.',
  tokenExpired: '로그인이 만료되었습니다. 다시 로그인해주세요.',
});

/** Bearer 토큰을 verify 로 검증해 req.auth 를 채우는 미들웨어를 만듭니다. */
function createBearerAuth(verify) {
  return function bearerAuth(req, res, next) {
    const match = BEARER_PATTERN.exec(req.get('Authorization') ?? '');
    if (!match) throw new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);

    try {
      req.auth = verify(match[1]);
    } catch (err) {
      throw err.expired
        ? new ApiError(401, 'TOKEN_EXPIRED', authMessages.tokenExpired)
        : new ApiError(401, 'UNAUTHORIZED', authMessages.unauthorized);
    }
    return next();
  };
}

/**
 * 🔒 로그인 필요 API 앞에 붙이는 미들웨어.
 * `Authorization: Bearer {accessToken}` 을 검증하고 `req.auth = { memberId }` 를 채웁니다.
 * @param {ReturnType<typeof import('./tokenProvider').createTokenProvider>} tokenProvider
 */
const createRequireAuth = (tokenProvider) => createBearerAuth(tokenProvider.verifyAccessToken);

/**
 * 🛡️ 관리자 API 앞에 붙이는 미들웨어. 관리자 토큰을 검증하고 `req.auth = { adminId }` 를 채웁니다.
 * 회원 토큰은 typ 가 달라 401 이 됩니다. 계정 상태 확인은 admin 모듈에서 합니다.
 * @param {ReturnType<typeof import('./tokenProvider').createTokenProvider>} tokenProvider
 */
const createRequireAdmin = (tokenProvider) => createBearerAuth(tokenProvider.verifyAdminAccessToken);

module.exports = { createRequireAuth, createRequireAdmin };
