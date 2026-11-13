'use strict';

/**
 * 데이터 보정용: 리뷰 행만으로 회원의 매너 온도 · 받은 평가 수를 다시 계산합니다.
 *
 *   npm run recalc:manner          # 전체 회원
 *   npm run recalc:manner -- 3 9   # 회원 id 3, 9 만
 */
const { pool } = require('../src/config/db');
const { createReviewRepository } = require('../src/review/reviewRepository');
const { parseId } = require('../src/review/reviewValidator');

async function main() {
  const args = process.argv.slice(2);
  const memberIds = args.map(parseId);
  if (memberIds.some((id) => id === null)) {
    console.error('회원 id 는 1 이상의 정수여야 합니다.');
    process.exitCode = 1;
    return;
  }
  const changed = await createReviewRepository(pool).recalculateMannerTemps(args.length > 0 ? memberIds : null);
  console.log(`매너 온도 재계산 완료: ${changed}명 변경`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
