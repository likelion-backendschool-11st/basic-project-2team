'use strict';

const { Router } = require('express');

/** /api/auth 아래에 마운트되는 회원가입 · 로그인 · 아이디/비밀번호 찾기 라우트 (docs/API_SPEC.md 2절) */
function createMemberRouter(memberController, { requireAuth }) {
  const router = Router();
  router.post('/signup', memberController.signup);
  router.get('/check', memberController.check);
  router.post('/login', memberController.login);
  router.post('/refresh', memberController.refresh);
  router.post('/logout', requireAuth, memberController.logout);
  router.post('/find-id', memberController.findId);
  router.post('/find-password', memberController.findPassword);
  router.post('/reset-password', memberController.resetPassword);
  return router;
}

module.exports = { createMemberRouter };
