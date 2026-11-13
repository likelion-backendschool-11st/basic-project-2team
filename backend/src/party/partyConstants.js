'use strict';

/** post_application.status (docs/03-db-design.md 2.9) */
const APPLICATION_STATUS = Object.freeze({
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  canceled: 'CANCELED',
  noShow: 'NO_SHOW',
});

/** 파티장이 내릴 수 있는 결정 */
const DECISION_STATUSES = Object.freeze([APPLICATION_STATUS.accepted, APPLICATION_STATUS.rejected]);
/** 신청자 목록에서 거를 수 있는 상태 (취소·노쇼는 목록에 나오지 않음) */
const LIST_STATUSES = Object.freeze([APPLICATION_STATUS.pending, APPLICATION_STATUS.accepted, APPLICATION_STATUS.rejected]);

const POST_STATUS = Object.freeze({ open: 'OPEN', paused: 'PAUSED', closed: 'CLOSED', completed: 'COMPLETED' });
/** 작성자가 바꿀 수 있는 공고 상태 */
const POST_STATUSES = Object.freeze(Object.values(POST_STATUS));
const MEMBER_STATUS = Object.freeze({ suspended: 'SUSPENDED', banned: 'BANNED', withdrawn: 'WITHDRAWN' });

/** post_application.role VARCHAR(30), message VARCHAR(200) */
const ROLE_MAX_LENGTH = 30;
const MESSAGE_MAX_LENGTH = 200;
/** 수락된 신청을 출발 이 시간 이내(이미 지난 경우 포함)에 취소하면 late_cancel 로 기록 (REQ-APPLY-002) */
const LATE_CANCEL_HOURS = 3;

/** notification.type (docs/03-db-design.md 2.12) */
const NOTIFICATION_TYPE = Object.freeze({
  applicationReceived: 'APPLICATION_RECEIVED',
  applicationResult: 'APPLICATION_RESULT',
  applicationCanceled: 'APPLICATION_CANCELED',
  postUpdated: 'POST_UPDATED',
});
/** notification.message VARCHAR(200). 공고 제목이 길면 잘라서 넣습니다. */
const NOTIFICATION_TITLE_MAX = 40;

const partyMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  roleInvalid: `포지션은 ${ROLE_MAX_LENGTH}자 이하로 입력해주세요.`,
  messageInvalid: `한 줄 메시지는 ${MESSAGE_MAX_LENGTH}자 이하로 입력해주세요.`,
  postStatusInvalid: `status 는 ${POST_STATUSES.join(', ')} 중 하나여야 합니다.`,
  postCompleted: '이미 완료된 파티는 상태를 바꿀 수 없습니다.',
  completeNoMembers: '파티원이 한 명도 없는 공고는 완료 처리할 수 없습니다.',
  completeNotStarted: '출발 시간이 지난 뒤에 완료 처리할 수 있습니다.',
  statusInvalid: `status 는 ${DECISION_STATUSES.join(', ')} 중 하나여야 합니다.`,
  listStatusInvalid: `status 는 ${LIST_STATUSES.join(', ')} 중 하나여야 합니다.`,
  unauthorized: '로그인이 필요합니다.',
  accountBanned: '영구 정지된 계정은 신청할 수 없습니다.',
  accountSuspended: '정지된 계정은 정지 기간 동안 신청할 수 없습니다.',
  postNotFound: '존재하지 않는 공고입니다.',
  applicationNotFound: '존재하지 않는 신청입니다.',
  notPostAuthor: '공고 작성자만 할 수 있습니다.',
  cannotApplyOwnPost: '본인이 쓴 공고에는 신청할 수 없습니다.',
  postClosed: '모집이 마감된 공고입니다.',
  postPaused: '모집이 일시 중단된 공고입니다.',
  pauseNotAllowed: '모집 중인 공고만 일시 중단할 수 있습니다.',
  partyFull: '모집 인원이 모두 찼습니다.',
  alreadyApplied: '이미 신청한 공고입니다.',
  reapplyNotAllowed: '거절되었거나 노쇼로 처리된 공고에는 다시 신청할 수 없습니다.',
  alreadyDecided: '이미 처리된 신청입니다.',
  cancelNotAllowed: '완료된 파티에서는 신청을 취소할 수 없습니다.',
  withdrawnMember: '탈퇴한 회원',
  /** 알림함 문구. title 은 공고 제목(잘린 것), nickname 은 신청자 닉네임 */
  notice: Object.freeze({
    applicationReceived: (nickname, title) => `${nickname}님이 '${title}' 공고에 참가를 신청했습니다.`,
    applicationCanceled: (nickname, title) => `${nickname}님이 '${title}' 파티 참가를 취소했습니다.`,
    accepted: (title) => `'${title}' 공고 참가 신청이 수락되었습니다.`,
    rejected: (title) => `'${title}' 공고 참가 신청이 거절되었습니다.`,
    closed: (title) => `'${title}' 공고의 모집이 마감되었습니다.`,
    completed: (title) => `'${title}' 파티가 완료 처리되었습니다.`,
  }),
});

module.exports = {
  APPLICATION_STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_TITLE_MAX,
  DECISION_STATUSES,
  LIST_STATUSES,
  POST_STATUS,
  POST_STATUSES,
  MEMBER_STATUS,
  ROLE_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  LATE_CANCEL_HOURS,
  partyMessages,
};
