'use strict';

const { Router } = require('express');

/** /api/posts 아래에 마운트되는 공고별 리뷰 라우트 (docs/API_SPEC.md 7절) */
function createPostReviewRouter(reviewController, { requireAuth }) {
  const router = Router();
  router.get('/:postId/reviews/targets', requireAuth, reviewController.listReviewTargets);
  router.post('/:postId/reviews', requireAuth, reviewController.submitReviews);
  return router;
}

/** /api/review-tags 에 마운트되는 평가 태그 라우트 */
function createReviewTagRouter(reviewController) {
  const router = Router();
  router.get('/', reviewController.listReviewTags);
  return router;
}

module.exports = { createPostReviewRouter, createReviewTagRouter };
