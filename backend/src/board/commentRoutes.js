'use strict';

const { Router } = require('express');

/**
 * /api/posts/:postId/comments 댓글 라우트 (docs/API_SPEC.md 5절).
 * board 라우터 안에 마운트되며 상위 경로의 postId 를 쓰기 위해 mergeParams 를 켭니다.
 */
function createCommentRouter(commentController, { requireAuth, optionalAuth }) {
  const router = Router({ mergeParams: true });
  router.get('/', optionalAuth, commentController.list);
  router.post('/', requireAuth, commentController.create);
  return router;
}

module.exports = { createCommentRouter };
