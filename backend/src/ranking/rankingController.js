'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 rankingService 에 맡깁니다. */
function createRankingController(rankingService) {
  async function getMannerRanking(req, res) {
    return sendSuccess(res, 200, await rankingService.getMannerRanking(req.query));
  }

  return { getMannerRanking };
}

module.exports = { createRankingController };
