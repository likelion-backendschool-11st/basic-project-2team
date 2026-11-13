'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 accountService 에 맡깁니다. req.auth 는 requireAuth 가 채웁니다. */
function createAccountController(accountService) {
  async function getMe(req, res) {
    return sendSuccess(res, 200, await accountService.getMe(req.auth.memberId));
  }

  async function updateProfile(req, res) {
    return sendSuccess(res, 200, await accountService.updateProfile(req.auth.memberId, req.body));
  }

  async function changePassword(req, res) {
    await accountService.changePassword(req.auth.memberId, req.body);
    return res.status(204).end();
  }

  async function withdraw(req, res) {
    await accountService.withdraw(req.auth.memberId, req.body);
    return res.status(204).end();
  }

  return { getMe, updateProfile, changePassword, withdraw };
}

module.exports = { createAccountController };
