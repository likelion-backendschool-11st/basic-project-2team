'use strict';

/** GET /api/notifications 조회 규칙 (docs/API_SPEC.md 4절 알림함) */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** 관심 알림(notification_subscription) 규칙 (docs/API_SPEC.md 4절 알림함) */
const MAX_SUBSCRIPTIONS = 20;
const CODE_PATTERN = /^[a-z0-9_-]{1,30}$/;

/** GET /api/notifications/stream: 서버 전체 연결 상한(넘으면 503, 화면은 폴링으로 대신)과 유휴 연결 유지용 주석 주기 */
const MAX_STREAM_CONNECTIONS = 2000;
const STREAM_HEARTBEAT_MS = 25_000;

/** 수락 버튼을 붙이는 파티 초대 알림 유형 (party 도메인 NOTIFICATION_TYPE.partyInvite 와 같은 값) */
const PARTY_INVITE_TYPE = 'PARTY_INVITE';

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
  tooManyConnections: '실시간 알림 연결이 많아 잠시 후 다시 시도해주세요.',
  subscriptionLimit: `관심 알림은 최대 ${MAX_SUBSCRIPTIONS}개까지 설정할 수 있습니다.`,
});

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SUBSCRIPTIONS, CODE_PATTERN, PARTY_INVITE_TYPE, MAX_STREAM_CONNECTIONS, STREAM_HEARTBEAT_MS, notificationMessages };
