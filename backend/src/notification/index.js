'use strict';

const { createNotificationRepository } = require('./notificationRepository');
const { createNotificationService } = require('./notificationService');
const { createNotificationController } = require('./notificationController');
const { createNotificationRouter } = require('./notificationRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createNotificationModule({ pool, notificationRepository = createNotificationRepository(pool), requireAuth }) {
  const controller = createNotificationController(createNotificationService({ notificationRepository }));
  return { router: createNotificationRouter(controller, { requireAuth }) };
}

module.exports = { createNotificationModule };
