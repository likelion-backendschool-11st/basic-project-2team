'use strict';

const { createReviewRepository } = require('./reviewRepository');
const { createReviewService } = require('./reviewService');
const { createReviewController } = require('./reviewController');
const { createPostReviewRouter, createReviewTagRouter } = require('./reviewRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createReviewModule({ pool, reviewRepository = createReviewRepository(pool), requireAuth }) {
  const reviewService = createReviewService({ reviewRepository });
  const reviewController = createReviewController(reviewService);
  return {
    postReviewRouter: createPostReviewRouter(reviewController, { requireAuth }),
    tagRouter: createReviewTagRouter(reviewController),
  };
}

module.exports = { createReviewModule };
