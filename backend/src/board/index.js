'use strict';

const { createBoardRepository } = require('./boardRepository');
const { createBoardService } = require('./boardService');
const { createBoardController } = require('./boardController');
const { createBoardRouter } = require('./boardRoutes');
const { createCommentRepository } = require('./commentRepository');
const { createCommentService } = require('./commentService');
const { createCommentController } = require('./commentController');
const { createCommentRouter } = require('./commentRoutes');

/**
 * 공고 목록·상세와 댓글을 repository → service → controller → router 로 조립합니다.
 * 테스트에서는 repository 를 바꿔 끼웁니다.
 */
function createBoardModule({
  pool,
  boardRepository = createBoardRepository(pool),
  commentRepository = createCommentRepository(pool),
  requireAuth,
  optionalAuth,
  now,
}) {
  const boardController = createBoardController(createBoardService({ boardRepository }));
  const commentController = createCommentController(createCommentService({ commentRepository, now }));
  const commentRouter = createCommentRouter(commentController, { requireAuth, optionalAuth });
  return { router: createBoardRouter(boardController, { optionalAuth, commentRouter }) };
}

module.exports = { createBoardModule };
