'use strict';

const { Router } = require('express');

/** /api/posts 아래에 마운트되는 공고별 투표 조회·생성 라우트 (docs/API_SPEC.md 5절) */
function createPostPollRouter(pollController, { requireAuth, optionalAuth }) {
  const router = Router();
  router.get('/:postId/poll', optionalAuth, pollController.get);
  router.post('/:postId/poll', requireAuth, pollController.create);
  return router;
}

/** /api/polls 아래에 마운트되는 투표 편집·투표·고정·확정·알림 라우트 (docs/API_SPEC.md 5절) */
function createPollRouter(pollController, { requireAuth }) {
  const router = Router();
  router.patch('/:pollId', requireAuth, pollController.update);
  router.put('/:pollId/votes', requireAuth, pollController.vote);
  router.patch('/:pollId/pin', requireAuth, pollController.pin);
  router.post('/:pollId/close', requireAuth, pollController.close);
  router.post('/:pollId/reminders', requireAuth, pollController.remind);
  return router;
}

module.exports = { createPostPollRouter, createPollRouter };
