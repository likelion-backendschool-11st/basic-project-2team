'use strict';

const { Router } = require('express');

/**
 * /api/posts 아래에 마운트되는 공고 목록·상세 라우트 (docs/API_SPEC.md 3절).
 * 다른 모듈의 /api/posts 라우터(공고 작성 등)와 같은 경로에 함께 마운트됩니다.
 */
function createBoardRouter(boardController, { optionalAuth }) {
  const router = Router();
  router.get('/', boardController.list);
  router.get('/:postId', optionalAuth, boardController.getDetail);
  return router;
}

module.exports = { createBoardRouter };
