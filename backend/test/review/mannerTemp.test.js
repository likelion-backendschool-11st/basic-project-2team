'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applyRatings, INITIAL_MANNER_TEMP } = require('../../src/review/mannerTemp');
const { levelForPoints } = require('../../src/common/activityPoint');

describe('매너 온도 계산 (applyRatings)', () => {
  it('별점별 증감: 5점 +0.5 / 4점 +0.2 / 3점 0 / 2점 −0.5 / 1점 −1.0', () => {
    assert.equal(applyRatings(36.5, [5]), 37);
    assert.equal(applyRatings(36.5, [4]), 36.7);
    assert.equal(applyRatings(36.5, [3]), 36.5);
    assert.equal(applyRatings(36.5, [2]), 36);
    assert.equal(applyRatings(36.5, [1]), 35.5);
  });

  it('여러 건을 반영해도 소수점 오차가 없다 (DECIMAL 문자열 입력 포함)', () => {
    assert.equal(applyRatings('36.5', [4, 4, 4]), 37.1);
    assert.equal(applyRatings('98.4', [4, 2]), 98.1);
    assert.equal(applyRatings(INITIAL_MANNER_TEMP, []), 36.5);
  });

  it('상한 99.9 · 하한 0.0 으로 보정하고, 한 건마다 보정한다', () => {
    assert.equal(applyRatings(99.8, [5]), 99.9);
    assert.equal(applyRatings(36.5, Array(200).fill(5)), 99.9);
    assert.equal(applyRatings(0.5, [1]), 0);
    assert.equal(applyRatings(36.5, Array(100).fill(1)), 0);
    // 상한에 닿은 뒤 나쁜 평가는 바로 반영된다
    assert.equal(applyRatings(36.5, [...Array(200).fill(5), 1]), 98.9);
  });
});

describe('레벨 계산 (levelForPoints)', () => {
  it('레벨 L 의 누적 기준은 25 × L × (L − 1) 점', () => {
    assert.equal(levelForPoints(0), 1);
    assert.equal(levelForPoints(49), 1);
    assert.equal(levelForPoints(50), 2);
    assert.equal(levelForPoints(149), 2);
    assert.equal(levelForPoints(150), 3);
    assert.equal(levelForPoints(2250), 10);
  });

  it('최대 Lv.99', () => {
    assert.equal(levelForPoints(25 * 99 * 98), 99);
    assert.equal(levelForPoints(10_000_000), 99);
  });
});
