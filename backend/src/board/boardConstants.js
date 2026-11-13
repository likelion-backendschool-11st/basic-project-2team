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

const boardMessages = Object.freeze({
  postNotFound: '존재하지 않는 공고입니다.',
  withdrawnHost: '탈퇴한 회원',
});

module.exports = { POST_STATUS, POST_ID_PATTERN, boardMessages };
