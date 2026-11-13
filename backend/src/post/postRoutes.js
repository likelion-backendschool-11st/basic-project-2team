'use strict';

const { Router } = require('express');
const { requireAuth } = require('../common/requireAuth');

/** /api/posts 아래에 마운트되는 공고 라우트 (docs/API_SPEC.md 3절) */
function createPostRouter(postController) {
  const router = Router();
  router.post('/', requireAuth, postController.create);
  return router;
}

module.exports = { createPostRouter };
