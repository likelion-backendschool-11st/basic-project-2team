'use strict';

const { createGameRepository } = require('./gameRepository');
const { createGameService } = require('./gameService');
const { createGameController } = require('./gameController');
const { createGameRouter } = require('./gameRoutes');

function createGameModule({ pool, gameRepository = createGameRepository(pool) }) {
  const gameService = createGameService({ gameRepository });
  return { router: createGameRouter(createGameController(gameService)) };
}

module.exports = { createGameModule };
