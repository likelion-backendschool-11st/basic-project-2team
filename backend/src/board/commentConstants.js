'use strict';

/** comment.status 값 (docs/03-db-design.md 2.10). HIDDEN 은 관리자 가림 — 목록에는 나오고 프론트에서 접어 둡니다. */
const COMMENT_STATUS = Object.freeze({
  visible: 'VISIBLE',
  hidden: 'HIDDEN',
  deleted: 'DELETED',
});

/** 댓글 입력 규칙 (frontend/src/data/commentData.ts commentText.max, comment.content VARCHAR(500)) */
const COMMENT_MAX_LENGTH = 500;

/** GET /api/posts/{postId}/comments 조회 규칙 (docs/API_SPEC.md 5절) */
const COMMENT_SORTS = Object.freeze(['oldest', 'newest']);
const DEFAULT_COMMENT_SORT = 'oldest';
/** frontend/src/data/commentData.ts COMMENT_PAGE_SIZE */
const DEFAULT_COMMENT_PAGE_SIZE = 4;
const MAX_COMMENT_PAGE_SIZE = 50;

/** 댓글을 쓸 수 없는 회원 상태 (정지 기간이 지난 SUSPENDED 는 허용) */
const MEMBER_STATUS = Object.freeze({
  suspended: 'SUSPENDED',
  banned: 'BANNED',
  withdrawn: 'WITHDRAWN',
});

const commentMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  textRequired: '댓글 내용을 입력해주세요.',
  textTooLong: `댓글은 ${COMMENT_MAX_LENGTH}자 이하로 입력해주세요.`,
  secretInvalid: 'secret 은 true/false 여야 합니다.',
  parentIdInvalid: 'parentId 는 1 이상의 정수여야 합니다.',
  sortInvalid: `sort 는 ${COMMENT_SORTS.join(', ')} 중 하나여야 합니다.`,
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_COMMENT_PAGE_SIZE} 사이의 정수여야 합니다.`,
  parentNotFound: '답글을 달 댓글이 존재하지 않습니다.',
  replyDepthExceeded: '답글에는 다시 답글을 달 수 없습니다.',
  accountSuspended: '이용이 정지된 계정입니다.',
  accountBanned: '영구 정지된 계정입니다.',
  unauthorized: '로그인이 필요합니다.',
  withdrawnAuthor: '탈퇴한 회원',
});

module.exports = {
  COMMENT_STATUS,
  COMMENT_MAX_LENGTH,
  COMMENT_SORTS,
  DEFAULT_COMMENT_SORT,
  DEFAULT_COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
  MEMBER_STATUS,
  commentMessages,
};
