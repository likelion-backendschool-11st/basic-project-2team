'use strict';

/**
 * 욕설 필터 (공고 제목·내용·파티명·직접 입력 상세 분류에서 사용).
 * 글자·숫자·공백만 남기고(`시.발`, `시*발` 같은 기호 끼워 넣기 우회 차단) 소문자로 맞춘 뒤 단어가 들어 있는지 봅니다.
 * ponytail: 단순 포함 검사입니다. 띄어쓰기 우회(`시 발`)는 `10시 발로란트` 같은 정상 글이 걸리지 않게 일부러 막지 않습니다.
 *           우회가 늘면 단어 경계·형태소 분석을 도입하거나 신고 기능(report)으로 보완합니다.
 */
const BAD_WORDS = Object.freeze([
  '시발', '씨발', '쉬발', '씨빨', '시빨', '씹새', '씹년', '씹창', '개새끼', '개세끼', '병신', '븅신', '지랄', '좆', '니미', '느금', '엠창', '애미', '애비없',
  '미친놈', '미친년', '또라이', '창녀', '한남충', '김치녀', '맘충', '틀딱', '장애인새끼',
  'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅄ', 'ㅈㄹ', 'ㅁㅊ', 'ㄲㅈ', 'ㄷㅊ',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt',
]);

const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');

/** 욕설이 들어 있으면 true */
function containsProfanity(text) {
  if (typeof text !== 'string' || !text) return false;
  const normalized = normalize(text);
  return BAD_WORDS.some((word) => normalized.includes(word));
}

/** 욕설 때문에 거절할 때 쓰는 오류 코드 (프론트가 이 코드를 보고 경고 모달을 띄움) */
const PROFANITY_ERROR_CODE = 'PROFANITY_DETECTED';

module.exports = { containsProfanity, PROFANITY_ERROR_CODE };
