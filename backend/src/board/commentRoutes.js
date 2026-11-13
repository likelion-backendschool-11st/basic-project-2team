'use strict';

const { Router } = require('express');

/**
 * /api/posts/:postId/comments 댓글 목록·작성 라우트 (docs/API_SPEC.md 5절).
 * board 라우터 안에 마운트되며 상위 경로의 postId 를 쓰기 위해 mergeParams 를 켭니다.
 */
function createCommentRouter(commentController, { requireAuth, optionalAuth }) {
  const router = Router({ mergeParams: true });
  router.get('/', optionalAuth, commentController.list);
  router.post('/', requireAuth, commentController.create);
  return router;
}

/** /api/comments 아래에 마운트되는 댓글 수정·삭제 라우트 (docs/API_SPEC.md 5절) */
function createCommentItemRouter(commentController, { requireAuth }) {
  const router = Router();
  router.patch('/:commentId', requireAuth, commentController.update);
  router.delete('/:commentId', requireAuth, commentController.remove);
  return router;
}

/** /api/reports 아래에 마운트되는 신고 라우트 (docs/API_SPEC.md 6절). 현재는 댓글 신고만 처리합니다. */
function createReportRouter(commentController, { requireAuth }) {
  const router = Router();
  router.post('/', requireAuth, commentController.report);
  return router;
}

module.exports = { createCommentRouter, createCommentItemRouter, createReportRouter };
