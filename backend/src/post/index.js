'use strict';

const { createPostRepository } = require('./postRepository');
const { createPostService } = require('./postService');
const { createPostController } = require('./postController');
const { createPostRouter } = require('./postRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createPostModule({ pool, postRepository = createPostRepository(pool), now }) {
  const postService = createPostService({ postRepository, now });
  const postController = createPostController(postService);
  return { router: createPostRouter(postController) };
}

module.exports = { createPostModule };
