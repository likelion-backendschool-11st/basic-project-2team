'use strict';

const { Router } = require('express');

/** /api/auth/email 아래에 마운트되는 이메일 인증 라우트 (docs/API_SPEC.md 2절) */
function createEmailVerificationRouter(emailVerificationController) {
  const router = Router();
  router.post('/send', emailVerificationController.send);
  router.post('/verify', emailVerificationController.verify);
  return router;
}

module.exports = { createEmailVerificationRouter };
