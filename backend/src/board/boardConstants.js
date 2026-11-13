'use strict';

/** post.status 값 (docs/03-db-design.md post). DELETED 는 상세에서 404 로 처리합니다. */
const POST_STATUS = Object.freeze({
  open: 'OPEN',
  closed: 'CLOSED',
  completed: 'COMPLETED',
  deleted: 'DELETED',
});

/** 경로 파라미터 postId 형식: 1 이상의 정수 (BIGINT UNSIGNED) */
const POST_ID_PATTERN = /^[1-9]\d{0,18}$/;

/** GET /api/posts 목록 조회 규칙 (docs/API_SPEC.md 3절) */
const POST_SORTS = Object.freeze(['recent', 'views', 'urgent']);
const DEFAULT_SORT = 'recent';
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;
const MAX_FILTER_TAGS = 5;
const MAX_SEARCH_LENGTH = 50;
/** category 코드 형식 (category.code). 목록에 없는 코드는 빈 결과로 응답합니다. */
const CATEGORY_PATTERN = /^[a-z0-9_-]{1,20}$/;

const boardMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  categoryInvalid: 'category 형식이 올바르지 않습니다.',
  sortInvalid: `sort 는 ${POST_SORTS.join(', ')} 중 하나여야 합니다.`,
  searchInvalid: `q 는 ${MAX_SEARCH_LENGTH}자 이하여야 합니다.`,
  tagsInvalid: `tags 는 쉼표로 구분한 태그 최대 ${MAX_FILTER_TAGS}개여야 합니다.`,
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  excludeClosedInvalid: 'excludeClosed 는 true 또는 false 여야 합니다.',
  postNotFound: '존재하지 않는 공고입니다.',
  withdrawnHost: '탈퇴한 회원',
});

module.exports = {
  POST_STATUS,
  POST_ID_PATTERN,
  POST_SORTS,
  DEFAULT_SORT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_FILTER_TAGS,
  MAX_SEARCH_LENGTH,
  CATEGORY_PATTERN,
  boardMessages,
};
