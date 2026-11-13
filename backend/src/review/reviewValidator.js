'use strict';

const { ApiError } = require('../common/ApiError');
const {
  ID_PATTERN,
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_REVIEWS_PER_REQUEST,
  MAX_TAGS_PER_REVIEW,
  reviewMessages: m,
} = require('./reviewConstants');

/**
 * 1 이상의 정수 id (문자열 또는 숫자)를 숫자로 바꿉니다. 형식이 틀리면 null.
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseId(raw) {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string' || !ID_PATTERN.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

/** 평가 한 건을 검증합니다. 오류는 fail(field, message) 로 쌓고, 정규화한 값을 돌려줍니다. */
function readReview(raw, index, { reviewerId, seenTargets, fail }) {
  const prefix = `reviews[${index}]`;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    fail(prefix, m.reviewInvalid);
    return null;
  }

  const targetMemberId = parseId(raw.targetMemberId);
  if (targetMemberId === null) fail(`${prefix}.targetMemberId`, m.targetInvalid);
  else if (targetMemberId === reviewerId) fail(`${prefix}.targetMemberId`, m.cannotReviewSelf);
  else if (seenTargets.has(targetMemberId)) fail(`${prefix}.targetMemberId`, m.targetDuplicated);
  else seenTargets.add(targetMemberId);

  const { rating } = raw;
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) fail(`${prefix}.rating`, m.ratingInvalid);

  const tags = raw.tags ?? [];
  const tagsValid =
    Array.isArray(tags) && tags.length <= MAX_TAGS_PER_REVIEW && tags.every((tag) => typeof tag === 'string' && tag !== '');
  if (!tagsValid) fail(`${prefix}.tags`, m.tagsInvalid);

  let comment = null;
  if (raw.comment !== undefined && raw.comment !== null) {
    if (typeof raw.comment !== 'string' || raw.comment.trim().length > MAX_COMMENT_LENGTH) {
      fail(`${prefix}.comment`, m.commentInvalid);
    } else {
      comment = raw.comment.trim() || null;
    }
  }

  return { targetMemberId, rating, tags: tagsValid ? [...new Set(tags)] : [], comment };
}

/**
 * 파티원 평가 제출 본문 `{ reviews: [{ targetMemberId, rating, tags?, comment? }] }` 을 검증합니다.
 * 태그 코드가 실제로 있는지, 대상이 파티원인지는 DB 를 봐야 하므로 서비스에서 확인합니다.
 * @param {unknown} body
 * @param {number} reviewerId
 * @returns {{ reviews: Array<{ targetMemberId: number, rating: number, tags: string[], comment: string | null }> }}
 */
function validateReviewSubmission(body, reviewerId) {
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const list = body && typeof body === 'object' ? body.reviews : undefined;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_REVIEWS_PER_REQUEST) {
    fail('reviews', m.reviewsInvalid);
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  }

  const seenTargets = new Set();
  const reviews = list.map((raw, index) => readReview(raw, index, { reviewerId, seenTargets, fail }));

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { reviews };
}

module.exports = { parseId, validateReviewSubmission };
