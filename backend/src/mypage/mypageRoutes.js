'use strict';

const { Router } = require('express');

/**
 * /api/members 아래에 마운트되는 마이페이지·회원 프로필 라우트 (docs/API_SPEC.md 8절).
 * `/me/...` 고정 경로를 `/:memberId` 보다 먼저 등록합니다.
 */
function createMypageRouter(mypageController, { requireAuth, optionalAuth }) {
  const router = Router();
  router.get('/me/summary', requireAuth, mypageController.getMySummary);
  router.get('/me/posts', requireAuth, mypageController.listMyPosts);
  router.get('/me/applications', requireAuth, mypageController.listMyApplications);
  router.get('/me/comments', requireAuth, mypageController.listMyComments);
  router.get('/me/favorites', requireAuth, mypageController.listFavorites);
  router.post('/me/favorites/:memberId', requireAuth, mypageController.addFavorite);
  router.delete('/me/favorites/:memberId', requireAuth, mypageController.removeFavorite);
  router.get('/:memberId', optionalAuth, mypageController.getMemberProfile);
  return router;
}

module.exports = { createMypageRouter };
