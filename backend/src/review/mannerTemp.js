'use strict';

/**
 * 매너 온도 계산 (docs/03-db-design.md 결정 사항 2).
 * 소수점 오차를 피하려고 0.1℃ 단위 정수로 계산합니다.
 */

/** 초기값 36.5℃, 범위 0.0 ~ 99.9℃ (0.1℃ 단위) */
const INITIAL_TENTHS = 365;
const MIN_TENTHS = 0;
const MAX_TENTHS = 999;
const INITIAL_MANNER_TEMP = INITIAL_TENTHS / 10;

/** 별점별 증감 (0.1℃ 단위): 5점 +0.5 / 4점 +0.2 / 3점 0 / 2점 −0.5 / 1점 −1.0 */
const RATING_DELTA_TENTHS = Object.freeze({ 5: 5, 4: 2, 3: 0, 2: -5, 1: -10 });

/**
 * 현재 매너 온도에 리뷰 별점을 순서대로 반영합니다. 한 건 반영할 때마다 범위를 보정하므로
 * 상한에 닿은 뒤 들어온 나쁜 평가도 바로 온도를 내립니다. 같은 순서(review.id 순)로 다시 계산하면 결과가 같습니다.
 * @param {number | string} current 현재 매너 온도 (DECIMAL 은 문자열로 읽힘)
 * @param {ReadonlyArray<number>} ratings 1~5
 * @returns {number} 소수 첫째 자리 매너 온도
 */
function applyRatings(current, ratings) {
  let tenths = Math.round(Number(current) * 10);
  for (const rating of ratings) {
    tenths = Math.min(MAX_TENTHS, Math.max(MIN_TENTHS, tenths + RATING_DELTA_TENTHS[rating]));
  }
  return tenths / 10;
}

module.exports = { INITIAL_MANNER_TEMP, RATING_DELTA_TENTHS, applyRatings };
