'use strict';

/** 공고 작성 입력 규칙 (docs/API_SPEC.md 3절, docs/03-db-design.md post) */
const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 100;
const BODY_MAX_LENGTH = 10000;
const PARTY_NAME_MAX_LENGTH = 30;
const HEADCOUNT_MIN = 2;
const HEADCOUNT_MAX = 16;
const MAX_TAGS = 5;
const TAG_MAX_LENGTH = 20;

/** 모집 유형은 game_content.content_type(RANK/NORMAL/DUNGEON/RAID)을 소문자로 쓴 값, 플레이 스타일은 frontend writeData.ts 기준 */
const PARTY_TYPES = Object.freeze(['raid', 'dungeon', 'rank', 'normal']);
const PLAY_STYLES = Object.freeze(['hard', 'casual', 'newbie', 'any']);

/** 임시저장 payload 에서 받는 필드와 타입. 작성 폼(frontend WriteDraft)의 값을 그대로 담되, 형식이 틀린 값은 버립니다. */
const DRAFT_STRING_FIELDS = Object.freeze({
  title: TITLE_MAX_LENGTH,
  body: BODY_MAX_LENGTH,
  partyName: PARTY_NAME_MAX_LENGTH,
  game: 50,
  type: 20,
  detail: 50,
  style: 20,
  date: 10,
  time: 5,
});
const DRAFT_BOOLEAN_FIELDS = Object.freeze(['tbd', 'voice']);

const POST_STATUS_DELETED = 'DELETED';
const POST_STATUS_OPEN = 'OPEN';
const POST_STATUS_CLOSED = 'CLOSED';
const POST_STATUS_COMPLETED = 'COMPLETED';

/** notification.type — 파티 모듈(NOTIFICATION_TYPE)·관리자 삭제 알림과 같은 값입니다. */
const NOTIFICATION_TYPE = Object.freeze({ postUpdated: 'POST_UPDATED', postDeleted: 'POST_DELETED' });
/** 공고 제목이 길면 이 글자 수에서 줄임표로 잘라 알림 문구(VARCHAR 200)에 넣습니다. */
const NOTICE_TITLE_MAX = 40;
/** 공고 수정·삭제를 알리는 대상: 대기 중·수락된 신청자 */
const NOTICE_TARGET_STATUSES = Object.freeze(['PENDING', 'ACCEPTED']);

const postMessages = Object.freeze({
  notice: Object.freeze({
    updated: (title) => `'${title}' 공고의 일정 또는 모집 내용이 수정되었습니다.`,
    deleted: (title) => `'${title}' 공고가 작성자에 의해 삭제되었습니다.`,
  }),
  invalidInput: '입력값을 확인해주세요.',
  postNotFound: '존재하지 않는 공고입니다.',
  notPostAuthor: '공고 작성자만 삭제할 수 있습니다.',
  notPostAuthorEdit: '공고 작성자만 수정할 수 있습니다.',
  notEditable: '완료된 공고는 수정할 수 없습니다.',
  headcountBelowCurrent: (current) => `이미 확정된 인원(${current}명)보다 적게 줄일 수 없습니다.`,
  draftInvalid: '임시저장할 내용이 올바르지 않습니다.',
  titleInvalid: `제목은 ${TITLE_MIN_LENGTH}~${TITLE_MAX_LENGTH}자로 입력해주세요.`,
  bodyRequired: '본문을 입력해주세요.',
  bodyTooLong: `본문은 ${BODY_MAX_LENGTH}자 이하로 입력해주세요.`,
  partyNameInvalid: `파티명은 ${PARTY_NAME_MAX_LENGTH}자 이하로 입력해주세요.`,
  gameRequired: '게임을 선택해주세요.',
  typeInvalid: `모집 유형은 ${PARTY_TYPES.join(', ')} 중 하나여야 합니다.`,
  detailInvalid: '상세 분류 형식이 올바르지 않습니다.',
  headcountInvalid: `모집 인원은 ${HEADCOUNT_MIN}~${HEADCOUNT_MAX}명의 정수여야 합니다.`,
  styleInvalid: `플레이 스타일은 ${PLAY_STYLES.join(', ')} 중 하나여야 합니다.`,
  scheduleRequired: '플레이 일정을 입력하거나 일정 미정을 선택해주세요.',
  scheduleInvalid: '올바른 일정 형식이 아닙니다. (ISO-8601)',
  schedulePast: '플레이 일정은 현재 시각 이후여야 합니다.',
  scheduleTbdInvalid: 'scheduleTbd 는 true/false 여야 합니다.',
  voiceInvalid: 'voiceRequired 는 true/false 여야 합니다.',
  tagsInvalid: `태그는 공백 없는 ${TAG_MAX_LENGTH}자 이하 문자열 최대 ${MAX_TAGS}개여야 합니다.`,
  gameNotFound: '존재하지 않는 게임입니다.',
  detailNotFound: '해당 게임에 없는 상세 분류입니다.',
  headcountOverMax: (max) => `이 모드의 최대 모집 인원은 ${max}명입니다.`,
  detailTypeMismatch: '선택한 모집 유형에 속하지 않는 상세 분류입니다.',
});

module.exports = {
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  BODY_MAX_LENGTH,
  PARTY_NAME_MAX_LENGTH,
  HEADCOUNT_MIN,
  HEADCOUNT_MAX,
  MAX_TAGS,
  TAG_MAX_LENGTH,
  PARTY_TYPES,
  PLAY_STYLES,
  DRAFT_STRING_FIELDS,
  DRAFT_BOOLEAN_FIELDS,
  NOTIFICATION_TYPE,
  NOTICE_TITLE_MAX,
  NOTICE_TARGET_STATUSES,
  POST_STATUS_DELETED,
  POST_STATUS_OPEN,
  POST_STATUS_CLOSED,
  POST_STATUS_COMPLETED,
  postMessages,
};
