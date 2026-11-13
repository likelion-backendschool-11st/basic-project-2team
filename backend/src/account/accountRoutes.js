'use strict';

const { Router } = require('express');

/**
 * /api/members 아래에 마운트되는 내 계정 관리 라우트 (docs/API_SPEC.md 2절).
 * mypage 라우터의 `/:memberId` 가 `/me` 를 잡지 않도록 mypage 보다 먼저 마운트합니다.
 */
function createAccountRouter(accountController, { requireAuth }) {
  const router = Router();
  router.get('/me', requireAuth, accountController.getMe);
  router.patch('/me', requireAuth, accountController.updateProfile);
  router.delete('/me', requireAuth, accountController.withdraw);
  router.patch('/me/password', requireAuth, accountController.changePassword);
  return router;
}

module.exports = { createAccountRouter };
