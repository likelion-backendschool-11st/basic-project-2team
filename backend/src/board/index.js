'use strict';

const { createBoardRepository } = require('./boardRepository');
const { createBoardService } = require('./boardService');
const { createBoardController } = require('./boardController');
const { createBoardRouter } = require('./boardRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createBoardModule({ pool, boardRepository = createBoardRepository(pool), optionalAuth }) {
  const boardService = createBoardService({ boardRepository });
  const boardController = createBoardController(boardService);
  return { router: createBoardRouter(boardController, { optionalAuth }) };
}

module.exports = { createBoardModule };
