'use strict';

const { Router } = require('express');

/** /api/notifications 아래에 마운트되는 알림함 라우트. 모두 로그인이 필요합니다. */
function createNotificationRouter(notificationController, { requireAuth }) {
  const router = Router();
  router.use(requireAuth);
  router.get('/', notificationController.list);
  // 고정 경로는 /:notificationId 보다 먼저 둡니다.
  router.get('/unread-count', notificationController.unreadCount);
  router.patch('/read-all', notificationController.markAllRead);
  router.patch('/:notificationId/read', notificationController.markRead);
  return router;
}

module.exports = { createNotificationRouter };
