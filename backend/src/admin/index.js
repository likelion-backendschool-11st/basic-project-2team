'use strict';

const { createAdminRepository } = require('./adminRepository');
const { createAdminService } = require('./adminService');
const { createAdminController } = require('./adminController');
const { createAdminRouter } = require('./adminRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createAdminModule({
  pool,
  adminRepository = createAdminRepository(pool),
  tokenProvider,
  postEvents,
  requireAdmin,
  bcryptRounds,
  now,
}) {
  const adminService = createAdminService({ adminRepository, tokenProvider, postEvents, bcryptRounds, now });
  const adminController = createAdminController(adminService);
  return { router: createAdminRouter(adminController, { requireAdmin }) };
}

module.exports = { createAdminModule };
