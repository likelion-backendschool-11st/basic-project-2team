'use strict';

const { Router } = require('express');

/** /api/admin 아래에 마운트되는 관리자 라우트 (docs/API_SPEC.md 9절). 로그인 외에는 모두 🛡️ 관리자 토큰 필요 */
function createAdminRouter(adminController, { requireAdmin }) {
  const router = Router();
  router.post('/auth/login', adminController.login);

  router.use(requireAdmin, adminController.loadAdmin);
  router.get('/me', adminController.me);
  router.get('/dashboard', adminController.dashboard);
  router.get('/reports', adminController.listReports);
  router.get('/reports/:reportId', adminController.getReport);
  router.patch('/reports/:reportId', adminController.processReport);
  router.get('/posts', adminController.listPosts);
  router.get('/posts/:postId', adminController.getPost);
  router.delete('/posts/:postId', adminController.deletePost);
  router.get('/members', adminController.listMembers);
  router.get('/members/:memberId', adminController.getMember);
  router.post('/members/:memberId/sanctions', adminController.sanctionMember);
  router.get('/comments', adminController.listComments);
  router.patch('/comments/:commentId', adminController.updateComment);
  router.get('/history', adminController.history);
  return router;
}

module.exports = { createAdminRouter };
