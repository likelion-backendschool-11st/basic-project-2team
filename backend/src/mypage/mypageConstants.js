'use strict';

/** 경로 파라미터 memberId 형식: 1 이상의 정수 (BIGINT UNSIGNED) */
const MEMBER_ID_PATTERN = /^[1-9]\d{0,18}$/;

/** 마이페이지 목록(내 공고·신청·댓글) 페이지네이션 */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** 프로필의 「유저들이 뽑은 태그 Top 3」 */
const TOP_TAG_LIMIT = 3;
/** 평균 별점은 최근 N건의 평가로 계산합니다 (화면 문구 「최근 30건 반영」) */
const RECENT_RATING_LIMIT = 30;

/** post_application.status 값. GET /api/members/me/applications?status= 필터에 씁니다. */
const APPLICATION_STATUSES = Object.freeze(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'NO_SHOW']);

const mypageMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  statusInvalid: `status 는 ${APPLICATION_STATUSES.join(', ')} 중 하나여야 합니다.`,
  unauthorized: '로그인이 필요합니다.',
  memberNotFound: '존재하지 않는 회원입니다.',
  cannotFavoriteSelf: '자기 자신은 즐겨찾기할 수 없습니다.',
  withdrawnMember: '탈퇴한 회원',
});

module.exports = {
  MEMBER_ID_PATTERN,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  TOP_TAG_LIMIT,
  RECENT_RATING_LIMIT,
  APPLICATION_STATUSES,
  mypageMessages,
};
