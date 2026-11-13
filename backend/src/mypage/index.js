'use strict';

const { createMypageRepository } = require('./mypageRepository');
const { createMypageService } = require('./mypageService');
const { createMypageController } = require('./mypageController');
const { createMypageRouter } = require('./mypageRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createMypageModule({ pool, mypageRepository = createMypageRepository(pool), requireAuth, optionalAuth }) {
  const mypageService = createMypageService({ mypageRepository });
  const mypageController = createMypageController(mypageService);
  return { router: createMypageRouter(mypageController, { requireAuth, optionalAuth }) };
}

module.exports = { createMypageModule };
