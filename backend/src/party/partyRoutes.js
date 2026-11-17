'use strict';

const { Router } = require('express');

/** /api/posts 아래에 마운트되는 파티 참가 라우트 (docs/API_SPEC.md 4절) */
function createPartyRouter(partyController, { requireAuth }) {
  const router = Router();
  router.post('/:postId/applications', requireAuth, partyController.apply);
  router.delete('/:postId/applications/me', requireAuth, partyController.cancelMine);
  router.get('/:postId/applications', requireAuth, partyController.listApplications);
  router.patch('/:postId/applications/:applicationId', requireAuth, partyController.decide);
  router.patch('/:postId/status', requireAuth, partyController.changeStatus);
  router.get('/:postId/participants', partyController.listParticipants);
  router.post('/:postId/invitations', requireAuth, partyController.invite);
  router.post('/:postId/invitations/accept', requireAuth, partyController.acceptInvitation);
  router.delete('/:postId/participants/:memberId', requireAuth, partyController.kick);
  return router;
}

module.exports = { createPartyRouter };
