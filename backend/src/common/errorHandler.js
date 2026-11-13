'use strict';

const { ApiError } = require('./ApiError');
const { sendError } = require('./response');

/** 등록되지 않은 경로 → 404 */
function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', '요청한 경로를 찾을 수 없습니다.');
}

/** Express 5 는 async 핸들러의 reject 도 여기로 전달합니다. 인자가 4개여야 에러 핸들러로 인식됩니다. */
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return sendError(res, err.status, err.code, err.message, err.fields, err.details);
  }
  if (err && err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', '요청 본문이 올바른 JSON 형식이 아닙니다.');
  }
  console.error(err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
}

module.exports = { notFoundHandler, errorHandler };
