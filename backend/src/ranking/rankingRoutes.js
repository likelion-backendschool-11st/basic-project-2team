'use strict';

const { Router } = require('express');

/** /api/rankings 아래에 마운트되는 랭킹 라우트 (docs/API_SPEC.md 8절) */
function createRankingRouter(rankingController) {
  const router = Router();
  router.get('/manner', rankingController.getMannerRanking);
  return router;
}

module.exports = { createRankingRouter };
