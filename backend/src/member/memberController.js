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

  async function login(req, res) {
    const data = await memberService.login(req.body);
    return sendSuccess(res, 200, data);
  }

  async function refresh(req, res) {
    const data = await memberService.refresh(req.body);
    return sendSuccess(res, 200, data);
  }

  /** req.auth 는 requireAuth 미들웨어가 채웁니다. */
  async function logout(req, res) {
    await memberService.logout(req.auth.memberId);
    return res.status(204).end();
  }

  return { signup, check, login, refresh, logout };
}

module.exports = { createMemberController };
