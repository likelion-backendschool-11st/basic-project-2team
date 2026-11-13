'use strict';

const { Router } = require('express');

/** /api/games 아래에 마운트되는 게임 목록 라우트 (docs/API_SPEC.md 3절) */
function createGameRouter(gameController) {
  const router = Router();
  router.get('/', gameController.list);
  return router;
}

module.exports = { createGameRouter };
