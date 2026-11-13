'use strict';

/** 경로 파라미터 postId · 요청 targetMemberId 형식: 1 이상의 정수 (BIGINT UNSIGNED) */
const ID_PATTERN = /^[1-9]\d{0,18}$/;

const MIN_RATING = 1;
const MAX_RATING = 5;
/** 한 줄 평 최대 길이 (review.comment VARCHAR(500)) */
const MAX_COMMENT_LENGTH = 500;
/** 한 번에 제출할 수 있는 평가 수. 정원 최대 16명에서 본인을 뺀 값 */
const MAX_REVIEWS_PER_REQUEST = 15;
/** 평가 한 건에 붙일 수 있는 태그 수 */
const MAX_TAGS_PER_REVIEW = 10;

/** 평가할 수 있는 공고 상태 */
const POST_STATUS_COMPLETED = 'COMPLETED';
const POST_STATUS_DELETED = 'DELETED';
/** 파티원으로 인정하는 신청 상태 */
const APPLICATION_STATUS_ACCEPTED = 'ACCEPTED';
const MEMBER_STATUS_WITHDRAWN = 'WITHDRAWN';

/** 중복 평가 UQ 제약 이름 (db/schema.sql) */
const REVIEW_UNIQUE_CONSTRAINT = 'uq_review';

const reviewMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  postNotFound: '존재하지 않는 공고입니다.',
  postNotCompleted: '활동이 완료된 공고만 평가할 수 있습니다.',
  notPartyMember: '파티에 참여한 회원만 평가할 수 있습니다.',
  targetNotPartyMember: '같은 파티에 참여한 회원만 평가할 수 있습니다.',
  alreadyReviewed: '이미 평가한 파티원이 있습니다.',
  reviewsInvalid: `reviews 는 1~${MAX_REVIEWS_PER_REQUEST}개의 평가 배열이어야 합니다.`,
  reviewInvalid: '평가 항목은 객체여야 합니다.',
  targetInvalid: 'targetMemberId 는 1 이상의 정수여야 합니다.',
  targetDuplicated: '같은 파티원을 한 번에 두 번 평가할 수 없습니다.',
  cannotReviewSelf: '자기 자신은 평가할 수 없습니다.',
  ratingInvalid: `rating 은 ${MIN_RATING}~${MAX_RATING} 사이의 정수여야 합니다.`,
  tagsInvalid: `tags 는 최대 ${MAX_TAGS_PER_REVIEW}개의 태그 코드 배열이어야 합니다.`,
  tagNotFound: '존재하지 않는 평가 태그입니다.',
  commentInvalid: `comment 는 ${MAX_COMMENT_LENGTH}자 이하의 문자열이어야 합니다.`,
});

module.exports = {
  ID_PATTERN,
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_REVIEWS_PER_REQUEST,
  MAX_TAGS_PER_REVIEW,
  POST_STATUS_COMPLETED,
  POST_STATUS_DELETED,
  APPLICATION_STATUS_ACCEPTED,
  MEMBER_STATUS_WITHDRAWN,
  REVIEW_UNIQUE_CONSTRAINT,
  reviewMessages,
};
