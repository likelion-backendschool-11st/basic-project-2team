'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 emailVerificationService 에 맡깁니다. */
function createEmailVerificationController(emailVerificationService) {
  async function send(req, res) {
    const data = await emailVerificationService.sendCode(req.body);
    return sendSuccess(res, 200, data);
  }

  async function verify(req, res) {
    const data = await emailVerificationService.verifyCode(req.body);
    return sendSuccess(res, 200, data);
  }

  return { send, verify };
}

module.exports = { createEmailVerificationController };
