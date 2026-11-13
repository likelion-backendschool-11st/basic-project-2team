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

const postMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
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
  postMessages,
};
