'use strict';

const { Router } = require('express');

/** /api/auth 아래에 마운트되는 회원가입 라우트 (docs/API_SPEC.md 2절) */
function createMemberRouter(memberController) {
  const router = Router();
  router.post('/signup', memberController.signup);
  router.get('/check', memberController.check);
  return router;
}

module.exports = { createMemberRouter };
