'use strict';

/** 투표 입력 규칙 (poll.title VARCHAR(40), poll.description VARCHAR(100), poll_option.label VARCHAR(30), poll.notice VARCHAR(200)) */
const POLL_TITLE_MAX = 40;
const POLL_DESCRIPTION_MAX = 100;
const POLL_OPTION_MAX_LENGTH = 30;
const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 5;
const POLL_NOTICE_MAX = 200;
/** 마감 시각은 지금부터 이 기간 안이어야 합니다. */
const POLL_MAX_DURATION_DAYS = 30;
/** 미투표자 알림은 이 간격(분)마다 한 번만 보낼 수 있습니다. */
const POLL_REMIND_INTERVAL_MINUTES = 10;

/**
 * 응답의 status. DB 에는 저장하지 않고 closed_at · closes_at 으로 계산합니다.
 * OPEN: 투표 중 · ENDED: 마감 시각이 지났지만 공대장이 결과를 확정하지 않음 · CONFIRMED: 공대장이 결과를 확정함
 */
const POLL_STATUS = Object.freeze({ open: 'OPEN', ended: 'ENDED', confirmed: 'CONFIRMED' });

/** notification.type (docs/03-db-design.md 2.12) */
const POLL_NOTIFICATION_TYPE = Object.freeze({ confirmed: 'POLL_CONFIRMED', reminder: 'POLL_REMINDER' });
/** notification.message VARCHAR(200) 에 넣을 때 공고 제목·항목 이름을 자르는 길이 */
const NOTIFICATION_TITLE_MAX = 40;

const MEMBER_STATUS = Object.freeze({ withdrawn: 'WITHDRAWN' });

const pollMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  titleRequired: '투표 제목을 입력해주세요.',
  titleTooLong: `투표 제목은 ${POLL_TITLE_MAX}자 이하로 입력해주세요.`,
  descriptionTooLong: `안내 문구는 ${POLL_DESCRIPTION_MAX}자 이하로 입력해주세요.`,
  booleanInvalid: 'true/false 여야 합니다.',
  closesAtInvalid: '마감 시각 형식이 올바르지 않습니다.',
  closesAtPast: '마감 시각은 현재 이후여야 합니다.',
  closesAtTooFar: `마감 시각은 ${POLL_MAX_DURATION_DAYS}일 이내로 설정해주세요.`,
  optionsCount: `투표 항목은 ${POLL_MIN_OPTIONS}~${POLL_MAX_OPTIONS}개여야 합니다.`,
  optionRequired: '비어 있는 투표 항목이 있습니다.',
  optionTooLong: `투표 항목은 ${POLL_OPTION_MAX_LENGTH}자 이하로 입력해주세요.`,
  optionDuplicated: '같은 이름의 투표 항목이 있습니다.',
  optionIdsInvalid: 'optionIds 는 항목 id 배열이어야 합니다.',
  finalOptionInvalid: '확정할 항목을 선택해주세요.',
  noticeTooLong: `공지 메시지는 ${POLL_NOTICE_MAX}자 이하로 입력해주세요.`,
  postNotFound: '존재하지 않는 공고입니다.',
  pollNotFound: '존재하지 않는 투표입니다.',
  optionNotFound: '이 투표에 없는 항목입니다.',
  notPostAuthor: '공대장(공고 작성자)만 할 수 있습니다.',
  notVoter: '이 파티의 공대원만 투표할 수 있습니다.',
  commentRequired: '이 공고에 댓글을 남긴 공대원만 투표할 수 있습니다.',
  singleChoiceOnly: '단일 선택 투표는 한 항목만 고를 수 있습니다.',
  pollAlreadyOpen: '이미 진행 중인 투표가 있습니다. 마감한 뒤 새 투표를 만들어주세요.',
  pollNotOpen: '마감된 투표입니다.',
  pollHasVotes: '공대원이 이미 투표해 항목을 고칠 수 없습니다.',
  pollAlreadyConfirmed: '이미 결과가 확정된 투표입니다.',
  remindTooSoon: `미투표자 알림은 ${POLL_REMIND_INTERVAL_MINUTES}분에 한 번만 보낼 수 있습니다.`,
  withdrawnMember: '탈퇴한 회원',
});

/** 결과 확정 · 미투표자 알림 문구 */
const pollNotices = Object.freeze({
  confirmedComment: (title, label) => `[투표 결과] '${title}' 투표가 '${label}'(으)로 확정되었습니다.`,
  confirmedNotification: (postTitle, label) => `'${postTitle}' 공고의 투표 결과가 '${label}'(으)로 확정되었습니다.`,
  reminderNotification: (postTitle, title) => `'${postTitle}' 공고의 '${title}' 투표에 아직 참여하지 않았습니다.`,
});

module.exports = {
  POLL_TITLE_MAX,
  POLL_DESCRIPTION_MAX,
  POLL_OPTION_MAX_LENGTH,
  POLL_MIN_OPTIONS,
  POLL_MAX_OPTIONS,
  POLL_NOTICE_MAX,
  POLL_MAX_DURATION_DAYS,
  POLL_REMIND_INTERVAL_MINUTES,
  POLL_STATUS,
  POLL_NOTIFICATION_TYPE,
  NOTIFICATION_TITLE_MAX,
  MEMBER_STATUS,
  pollMessages,
  pollNotices,
};
