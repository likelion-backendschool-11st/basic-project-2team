'use strict';

const { Router } = require('express');

/** /api/posts 아래에 마운트되는 파티 참가 라우트 (docs/API_SPEC.md 4절) */
function createPartyRouter(partyController, { requireAuth }) {
  const router = Router();
  router.post('/:postId/applications', requireAuth, partyController.apply);
  router.delete('/:postId/applications/me', requireAuth, partyController.cancelMine);
  router.get('/:postId/applications', requireAuth, partyController.listApplications);
  router.patch('/:postId/applications/:applicationId', requireAuth, partyController.decide);
  router.get('/:postId/participants', partyController.listParticipants);
  return router;
}

module.exports = { createPartyRouter };
