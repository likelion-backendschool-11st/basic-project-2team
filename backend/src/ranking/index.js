'use strict';

const { createRankingRepository } = require('./rankingRepository');
const { createRankingService } = require('./rankingService');
const { createRankingController } = require('./rankingController');
const { createRankingRouter } = require('./rankingRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createRankingModule({ pool, rankingRepository = createRankingRepository(pool) }) {
  const rankingService = createRankingService({ rankingRepository });
  const rankingController = createRankingController(rankingService);
  return { router: createRankingRouter(rankingController) };
}

module.exports = { createRankingModule };
