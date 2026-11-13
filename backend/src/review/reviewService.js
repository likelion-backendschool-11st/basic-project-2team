'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_STATUS_COMPLETED, REVIEW_UNIQUE_CONSTRAINT, reviewMessages: m } = require('./reviewConstants');
const { parseId, validateReviewSubmission } = require('./reviewValidator');

const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', m.postNotFound);
const alreadyReviewed = () => new ApiError(409, 'ALREADY_REVIEWED', m.alreadyReviewed);

const isDuplicateReview = (err) =>
  err?.code === 'ER_DUP_ENTRY' && String(err.sqlMessage ?? err.message).includes(REVIEW_UNIQUE_CONSTRAINT);

/**
 * 평가 태그 조회 · 평가 대상 조회 · 평가 제출 비즈니스 로직.
 * @param {{ reviewRepository: ReturnType<typeof import('./reviewRepository').createReviewRepository> }} deps
 */
function createReviewService({ reviewRepository }) {
  /**
   * 평가할 수 있는 공고와 파티 구성원을 불러옵니다.
   * 공고가 없으면 404, 요청자가 파티원이 아니면 403, 활동 완료(COMPLETED) 전이면 409.
   */
  async function loadParty(rawPostId, reviewerId) {
    const postId = parseId(rawPostId);
    if (postId === null) throw postNotFound();
    const post = await reviewRepository.findPost(postId);
    if (!post) throw postNotFound();

    const members = await reviewRepository.findPartyMembers(postId);
    if (!members.some((member) => member.id === reviewerId)) {
      throw new ApiError(403, 'NOT_PARTY_MEMBER', m.notPartyMember);
    }
    if (post.status !== POST_STATUS_COMPLETED) throw new ApiError(409, 'POST_NOT_COMPLETED', m.postNotCompleted);
    return { post, members };
  }

  /** GET /api/review-tags — 활성 평가 태그 */
  async function listReviewTags() {
    const tags = await reviewRepository.findActiveReviewTags();
    return tags.map((tag) => ({ code: tag.code, label: tag.label }));
  }

  /** GET /api/posts/{postId}/reviews/targets — 본인을 뺀 파티원과 평가 여부 */
  async function listReviewTargets(rawPostId, reviewerId) {
    const { post, members } = await loadParty(rawPostId, reviewerId);
    const reviewed = new Set(await reviewRepository.findReviewedTargetIds(post.id, reviewerId));
    return members
      .filter((member) => member.id !== reviewerId)
      .map((member) => ({
        id: member.id,
        nickname: member.nickname,
        avatarUrl: member.avatarUrl ?? null,
        level: member.level,
        game: post.gameName,
        characterName: member.characterName ?? null,
        role: member.role ?? null,
        isHost: Boolean(member.isHost),
        reviewed: reviewed.has(member.id),
      }));
  }

  /**
   * POST /api/posts/{postId}/reviews — 여러 파티원 평가를 한 번에 저장합니다. 하나라도 안 되면 아무것도 저장하지 않습니다.
   * @returns {Promise<{ reviewIds: number[] }>}
   */
  async function submitReviews(rawPostId, reviewerId, body) {
    const { post, members } = await loadParty(rawPostId, reviewerId);
    const { reviews } = validateReviewSubmission(body, reviewerId);

    const tagIdByCode = new Map((await reviewRepository.findActiveReviewTags()).map((tag) => [tag.code, tag.id]));
    const fields = [];
    reviews.forEach((review, index) => {
      if (review.tags.some((code) => !tagIdByCode.has(code))) {
        fields.push({ field: `reviews[${index}].tags`, message: m.tagNotFound });
      }
    });
    if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);

    const memberIds = new Set(members.map((member) => member.id));
    if (reviews.some((review) => !memberIds.has(review.targetMemberId))) {
      throw new ApiError(403, 'REVIEW_TARGET_NOT_PARTY_MEMBER', m.targetNotPartyMember);
    }

    const reviewed = new Set(await reviewRepository.findReviewedTargetIds(post.id, reviewerId));
    if (reviews.some((review) => reviewed.has(review.targetMemberId))) throw alreadyReviewed();

    try {
      const reviewIds = await reviewRepository.createReviews({
        postId: post.id,
        reviewerId,
        reviews: reviews.map((review) => ({
          targetMemberId: review.targetMemberId,
          rating: review.rating,
          comment: review.comment,
          tagIds: review.tags.map((code) => tagIdByCode.get(code)),
        })),
      });
      return { reviewIds };
    } catch (err) {
      // 확인과 저장 사이에 같은 평가가 먼저 저장된 경우
      if (isDuplicateReview(err)) throw alreadyReviewed();
      throw err;
    }
  }

  return { listReviewTags, listReviewTargets, submitReviews };
}

module.exports = { createReviewService };
