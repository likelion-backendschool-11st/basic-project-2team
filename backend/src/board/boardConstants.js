'use strict';

/** post.status 값 (docs/03-db-design.md post). DELETED 는 상세에서 404 로 처리합니다. */
const POST_STATUS = Object.freeze({
  open: 'OPEN',
  paused: 'PAUSED',
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
/** 출발 시간대(한국 시간 기준 시각 [시작, 끝)) */
const TIME_SLOTS = Object.freeze({ dawn: [0, 6], morning: [6, 12], afternoon: [12, 18], evening: [18, 24] });
const KST_OFFSET_HOURS = 9;
/** 상세 필터: 모집 유형·플레이 스타일(post 작성 값과 같음), 모집 인원 구간 [최소, 최대], 출발 일자(한국 시간 기준) */
const LIST_PARTY_TYPES = Object.freeze(['raid', 'dungeon', 'rank', 'normal']);
const LIST_PLAY_STYLES = Object.freeze(['hard', 'casual', 'newbie', 'any']);
const HEADCOUNT_RANGES = Object.freeze({ duo: [2, 2], small: [3, 4], mid: [5, 8], large: [9, 16] });
/** 상세 분류(game_content.code) 형식 */
const CONTENT_CODE_PATTERN = /^[a-z0-9_-]{1,30}$/;
const SCHEDULE_DAYS = Object.freeze(['today', 'tomorrow', 'week', 'tbd']);
const CATEGORY_PATTERN = /^[a-z0-9_-]{1,20}$/;

/** GET /api/posts/popular · urgent (메인 화면, docs/API_SPEC.md 3절). 메인 카드 수(frontend homeData)에 맞춘 기본값 */
const DEFAULT_FEATURED_LIMIT = 4;
const MAX_FEATURED_LIMIT = 20;
/** 마감 임박 기준: 남은 자리가 이 수 이하이거나 출발이 이 시간 안으로 다가온 모집 중 공고 */
const URGENT_REMAINING_SEATS = 2;
const URGENT_WITHIN_HOURS = 24;

const boardMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  limitInvalid: `limit 는 1~${MAX_FEATURED_LIMIT} 사이의 정수여야 합니다.`,
  categoryInvalid: 'category 형식이 올바르지 않습니다.',
  gameInvalid: 'game 은 게임 코드(영문 소문자·숫자·_-, 20자 이하)여야 합니다.',
  typeInvalid: `type 은 ${LIST_PARTY_TYPES.join(', ')} 중 하나여야 합니다.`,
  styleInvalid: `style 은 ${LIST_PLAY_STYLES.join(', ')} 중 하나여야 합니다.`,
  detailInvalid: 'detail 은 상세 분류 코드(영문 소문자·숫자·_-, 30자 이하)여야 합니다.',
  headcountInvalid: `headcount 는 ${Object.keys(HEADCOUNT_RANGES).join(', ')} 중 하나여야 합니다.`,
  dateInvalid: `date 는 ${SCHEDULE_DAYS.join(', ')} 중 하나여야 합니다.`,
  voiceInvalid: 'voice 는 true 또는 false 여야 합니다.',
  timeInvalid: `time 은 ${Object.keys(TIME_SLOTS).join(', ')} 중 하나여야 합니다.`,
  sortInvalid: `sort 는 ${POST_SORTS.join(', ')} 중 하나여야 합니다.`,
  searchInvalid: `q 는 ${MAX_SEARCH_LENGTH}자 이하여야 합니다.`,
  tagsInvalid: `tags 는 쉼표로 구분한 태그 최대 ${MAX_FILTER_TAGS}개여야 합니다.`,
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  excludeClosedInvalid: 'excludeClosed 는 true 또는 false 여야 합니다.',
  postNotFound: '존재하지 않는 공고입니다.',
  tooManyConnections: '실시간 연결이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  withdrawnHost: '탈퇴한 회원',
});

module.exports = {
  DEFAULT_FEATURED_LIMIT,
  MAX_FEATURED_LIMIT,
  URGENT_REMAINING_SEATS,
  URGENT_WITHIN_HOURS,
  POST_STATUS,
  POST_ID_PATTERN,
  POST_SORTS,
  TIME_SLOTS,
  KST_OFFSET_HOURS,
  LIST_PARTY_TYPES,
  LIST_PLAY_STYLES,
  HEADCOUNT_RANGES,
  SCHEDULE_DAYS,
  CONTENT_CODE_PATTERN,
  DEFAULT_SORT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_FILTER_TAGS,
  MAX_SEARCH_LENGTH,
  CATEGORY_PATTERN,
  boardMessages,
};
