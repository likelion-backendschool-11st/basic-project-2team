'use strict';

const { Router } = require('express');

/** /api/posts 아래에 마운트되는 공고 라우트 (docs/API_SPEC.md 3절) */
function createPostRouter(postController, { requireAuth }) {
  const router = Router();
  router.post('/', requireAuth, postController.create);
  router.post('/drafts', requireAuth, postController.saveDraft);
  router.get('/drafts/latest', requireAuth, postController.getLatestDraft);
  router.delete('/:postId', requireAuth, postController.remove);
  router.patch('/:postId/status', requireAuth, postController.changeStatus);
  return router;
}

module.exports = { createPostRouter };
