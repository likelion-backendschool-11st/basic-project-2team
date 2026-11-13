'use strict';

const { sendSuccess } = require('../common/response');

function createGameController(gameService) {
  async function list(req, res) {
    return sendSuccess(res, 200, await gameService.listGames());
  }

  return { list };
}

module.exports = { createGameController };
