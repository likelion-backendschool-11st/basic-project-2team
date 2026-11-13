'use strict';

const { Router } = require('express');

/**
 * /api/posts 아래에 마운트되는 공고 목록·상세·댓글 라우트 (docs/API_SPEC.md 3절, 5절).
 * 다른 모듈의 /api/posts 라우터(공고 작성 등)와 같은 경로에 함께 마운트됩니다.
 */
function createBoardRouter(boardController, { optionalAuth, commentRouter }) {
  const router = Router();
  router.get('/', boardController.list);
  // 고정 경로는 /:postId 보다 먼저 둡니다 (아니면 postId 로 해석돼 404 가 됩니다).
  router.get('/popular', boardController.popular);
  router.get('/urgent', boardController.urgent);
  router.use('/:postId/comments', commentRouter);
  router.get('/:postId', optionalAuth, boardController.getDetail);
  return router;
}

module.exports = { createBoardRouter };
