'use strict';

/** GET /api/notifications 조회 규칙 (docs/API_SPEC.md 4절 알림함) */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** 관심 알림(notification_subscription) 규칙 (docs/API_SPEC.md 4절 알림함) */
const MAX_SUBSCRIPTIONS = 20;
const CODE_PATTERN = /^[a-z0-9_-]{1,30}$/;

const notificationMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  unreadInvalid: 'unread 는 true/false 여야 합니다.',
  notFound: '존재하지 않는 알림입니다.',
  subscriptionNotFound: '존재하지 않는 관심 알림 설정입니다.',
  gameInvalid: 'game 은 게임 코드(영문 소문자·숫자·_-, 30자 이하)여야 합니다.',
  detailInvalid: 'detail 은 상세 분류 코드(영문 소문자·숫자·_-, 30자 이하)여야 합니다.',
  enabledInvalid: 'enabled 는 true/false 여야 합니다.',
  gameNotFound: '존재하지 않는 게임입니다.',
  detailNotFound: '존재하지 않는 상세 분류입니다.',
  subscriptionExists: '이미 설정한 관심 알림입니다.',
  subscriptionLimit: `관심 알림은 최대 ${MAX_SUBSCRIPTIONS}개까지 설정할 수 있습니다.`,
});

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SUBSCRIPTIONS, CODE_PATTERN, notificationMessages };
