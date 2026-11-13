'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 notificationService 에 맡깁니다. */
function createNotificationController(notificationService) {
  const memberId = (req) => req.auth.memberId;

  async function list(req, res) {
    return sendSuccess(res, 200, await notificationService.list(memberId(req), req.query));
  }

  async function unreadCount(req, res) {
    return sendSuccess(res, 200, await notificationService.unreadCount(memberId(req)));
  }

  async function markRead(req, res) {
    await notificationService.markRead(memberId(req), req.params.notificationId);
    return res.status(204).end();
  }

  async function markAllRead(req, res) {
    await notificationService.markAllRead(memberId(req));
    return res.status(204).end();
  }

  return { list, unreadCount, markRead, markAllRead };
}

module.exports = { createNotificationController };
