'use strict';

const { ApiError } = require('./ApiError');

/**
 * 🔒 라우트용. 앞단의 인증 미들웨어(로그인/JWT 이슈에서 구현)가 req.memberId 를 채워줘야 통과합니다.
 * 그 전까지는 모든 🔒 요청이 401 입니다.
 */
function requireAuth(req, res, next) {
  if (!req.memberId) return next(new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.'));
  return next();
}

module.exports = { requireAuth };
