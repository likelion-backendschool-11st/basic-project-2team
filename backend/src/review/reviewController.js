'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 reviewService 에 맡깁니다. */
function createReviewController(reviewService) {
  async function listReviewTags(req, res) {
    return sendSuccess(res, 200, await reviewService.listReviewTags());
  }

  async function listReviewTargets(req, res) {
    return sendSuccess(res, 200, await reviewService.listReviewTargets(req.params.postId, req.auth.memberId));
  }

  async function submitReviews(req, res) {
    return sendSuccess(res, 201, await reviewService.submitReviews(req.params.postId, req.auth.memberId, req.body));
  }

  return { listReviewTags, listReviewTargets, submitReviews };
}

module.exports = { createReviewController };
