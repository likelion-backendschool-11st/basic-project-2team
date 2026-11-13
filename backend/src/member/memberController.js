'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 memberService 에 맡깁니다. */
function createMemberController(memberService) {
  async function signup(req, res) {
    const data = await memberService.signup(req.body);
    return sendSuccess(res, 201, data);
  }

  async function check(req, res) {
    const data = await memberService.checkAvailability(req.query);
    return sendSuccess(res, 200, data);
  }

  return { signup, check };
}

module.exports = { createMemberController };
