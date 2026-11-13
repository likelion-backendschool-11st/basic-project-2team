'use strict';

/**
 * 활동 점수 · 서비스 레벨 (docs/03-db-design.md 결정 사항 8, 8-1, 8-3).
 * 점수를 주는 쪽은 자기 트랜잭션의 connection 으로 awardActivityPoints 를 호출합니다.
 */

/** activity_point_log.action_type 과 1건당 점수 */
const ACTIVITY_POINTS = Object.freeze({
  POST_CREATE: 10,
  COMMENT_CREATE: 2,
  REVIEW_WRITE: 5,
  PARTY_COMPLETE: 20,
});

const MIN_LEVEL = 1;
const MAX_LEVEL = 99;

/** 레벨 L 에 도달하는 누적 점수: 25 × L × (L − 1) (Lv.2 = 50, Lv.3 = 150, Lv.10 = 2,250) */
const pointsForLevel = (level) => 25 * level * (level - 1);

/**
 * 누적 점수로 도달한 레벨 (1~99)
 * @param {number} points
 * @returns {number}
 */
function levelForPoints(points) {
  let level = MIN_LEVEL;
  while (level < MAX_LEVEL && pointsForLevel(level + 1) <= points) level += 1;
  return level;
}

/**
 * 활동 점수를 지급합니다. 이력(activity_point_log)을 남기고 member.activity_point · level 을 갱신합니다.
 * 지급은 레벨을 내리지 않습니다 (점수 없이 레벨만 있는 기존 데이터 보호). 호출하는 쪽의 트랜잭션 안에서 실행해야 합니다.
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number} memberId
 * @param {ReadonlyArray<{ actionType: keyof typeof ACTIVITY_POINTS, refId: number }>} entries
 */
async function awardActivityPoints(connection, memberId, entries) {
  if (entries.length === 0) return;
  const rows = entries.map((entry) => [memberId, entry.actionType, entry.refId, ACTIVITY_POINTS[entry.actionType]]);
  await connection.query('INSERT INTO activity_point_log (member_id, action_type, ref_id, point) VALUES ?', [rows]);

  const [[member]] = await connection.query('SELECT activity_point AS activityPoint, level FROM member WHERE id = ? FOR UPDATE', [
    memberId,
  ]);
  const activityPoint = member.activityPoint + rows.reduce((sum, row) => sum + row[3], 0);
  const level = Math.max(member.level, levelForPoints(activityPoint));
  await connection.query('UPDATE member SET activity_point = ?, level = ? WHERE id = ?', [activityPoint, level, memberId]);
}

module.exports = { ACTIVITY_POINTS, MIN_LEVEL, MAX_LEVEL, levelForPoints, awardActivityPoints };
