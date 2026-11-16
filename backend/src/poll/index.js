'use strict';

const { createPollRepository } = require('./pollRepository');
const { createPollService } = require('./pollService');
const { createPollController } = require('./pollController');
const { createPostPollRouter, createPollRouter } = require('./pollRoutes');

/**
 * 파티 의견 조율 투표를 repository → service → controller → router 로 조립합니다.
 * 테스트에서는 repository 를 바꿔 끼웁니다.
 * @returns {{ postRouter, router }} postRouter → /api/posts, router → /api/polls
 */
function createPollModule({ pool, pollRepository = createPollRepository(pool), postEvents, requireAuth, optionalAuth, now }) {
  const pollController = createPollController(createPollService({ pollRepository, postEvents, now }));
  return {
    postRouter: createPostPollRouter(pollController, { requireAuth, optionalAuth }),
    router: createPollRouter(pollController, { requireAuth }),
  };
}

module.exports = { createPollModule };
