'use strict';

const express = require('express');
const { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } = require('./accountConstants');

/**
 * /api/members 아래에 마운트되는 내 계정 관리 라우트 (docs/API_SPEC.md 2절).
 * mypage 라우터의 `/:memberId` 가 `/me` 를 잡지 않도록 mypage 보다 먼저 마운트합니다.
 */
function createAccountRouter(accountController, { requireAuth }) {
  const router = express.Router();
  // 프로필 이미지는 JSON 이 아니라 이미지 바이트 그대로 받습니다. 로그인 확인 뒤에 본문을 읽습니다.
  const readImage = express.raw({ type: [...AVATAR_CONTENT_TYPES], limit: AVATAR_MAX_BYTES });

  router.get('/me', requireAuth, accountController.getMe);
  router.patch('/me', requireAuth, accountController.updateProfile);
  router.delete('/me', requireAuth, accountController.withdraw);
  router.patch('/me/password', requireAuth, accountController.changePassword);
  router.put('/me/avatar', requireAuth, readImage, accountController.updateAvatar);
  router.delete('/me/avatar', requireAuth, accountController.deleteAvatar);
  return router;
}

module.exports = { createAccountRouter };
