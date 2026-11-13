'use strict';

/** GET /api/notifications 조회 규칙 (docs/API_SPEC.md 4절 알림함) */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const notificationMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  unreadInvalid: 'unread 는 true/false 여야 합니다.',
  notFound: '존재하지 않는 알림입니다.',
});

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, notificationMessages };
