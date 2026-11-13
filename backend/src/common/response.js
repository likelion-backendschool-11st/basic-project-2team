'use strict';

/** 성공 응답 `{ success: true, data }` 을 보냅니다. */
function sendSuccess(res, status, data) {
  return res.status(status).json({ success: true, data });
}

/** 실패 응답 `{ success: false, error }` 을 보냅니다. */
function sendError(res, status, code, message, fields) {
  const error = fields && fields.length > 0 ? { code, message, fields } : { code, message };
  return res.status(status).json({ success: false, error });
}

module.exports = { sendSuccess, sendError };
