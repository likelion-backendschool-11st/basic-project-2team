'use strict';

/** 매너 랭킹 개수 (?limit=) */
const DEFAULT_RANKING_LIMIT = 10;
const MAX_RANKING_LIMIT = 50;

/** 랭킹에 나오는 회원 상태 (경고·정지·영구 정지·탈퇴 회원은 제외) */
const RANKED_MEMBER_STATUS = 'ACTIVE';

const rankingMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  limitInvalid: `limit 는 1~${MAX_RANKING_LIMIT} 사이의 정수여야 합니다.`,
});

module.exports = { DEFAULT_RANKING_LIMIT, MAX_RANKING_LIMIT, RANKED_MEMBER_STATUS, rankingMessages };
