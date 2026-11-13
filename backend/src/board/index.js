'use strict';

const { createBoardRepository } = require('./boardRepository');
const { createBoardService } = require('./boardService');
const { createBoardController } = require('./boardController');
const { createBoardRouter } = require('./boardRoutes');
const { createCommentRepository } = require('./commentRepository');
const { createCommentService } = require('./commentService');
const { createCommentController } = require('./commentController');
const { createCommentRouter, createCommentItemRouter, createReportRouter } = require('./commentRoutes');

/**
 * 공고 목록·상세, 댓글, 댓글 신고를 repository → service → controller → router 로 조립합니다.
 * 테스트에서는 repository 를 바꿔 끼웁니다.
 * @returns {{ router, commentRouter, reportRouter }}
 *   router → /api/posts, commentRouter → /api/comments, reportRouter → /api/reports
 */
function createBoardModule({
  pool,
  boardRepository = createBoardRepository(pool),
  commentRepository = createCommentRepository(pool),
  requireAuth,
  optionalAuth,
  now,
}) {
  const boardController = createBoardController(createBoardService({ boardRepository, now }));
  const commentController = createCommentController(createCommentService({ commentRepository, now }));

  const postCommentRouter = createCommentRouter(commentController, { requireAuth, optionalAuth });
  return {
    router: createBoardRouter(boardController, { optionalAuth, commentRouter: postCommentRouter }),
    commentRouter: createCommentItemRouter(commentController, { requireAuth }),
    reportRouter: createReportRouter(commentController, { requireAuth }),
  };
}

module.exports = { createBoardModule };
