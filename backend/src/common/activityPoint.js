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

/** 하루 지급 횟수 제한 (결정 사항 8-1). 하루는 한국 시간 자정 기준입니다. */
const DAILY_LIMITS = Object.freeze({
  POST_CREATE: 3,
  COMMENT_CREATE: 10,
});

/** 글이 삭제되면 받은 점수를 회수하는 action_type (결정 사항 8-2) */
const REVOKE_TYPES = Object.freeze({
  POST_CREATE: 'POST_REVOKE',
  COMMENT_CREATE: 'COMMENT_REVOKE',
});

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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

/**
 * now 가 속한 한국 시간 하루의 시작 시각 (UTC Date). DB 의 created_at 은 UTC 로 저장됩니다.
 * @param {Date} now
 */
function startOfKstDay(now) {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - KST_OFFSET_MS);
}

/**
 * 하루 횟수 제한이 있는 활동(공고 작성 · 댓글 작성)의 점수를 지급합니다. 오늘 이미 한도만큼 받았으면 지급하지 않습니다.
 * 회수된 글도 오늘 받은 횟수에 포함되므로, 쓰고 지우기를 반복해도 한도를 넘지 못합니다.
 * 호출하는 쪽의 트랜잭션 안에서 실행해야 합니다.
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {{ memberId: number, actionType: keyof typeof DAILY_LIMITS, refId: number, now?: Date }} input
 * @returns {Promise<boolean>} 지급했으면 true
 */
async function awardDailyLimitedPoints(connection, { memberId, actionType, refId, now = new Date() }) {
  // 같은 회원의 동시 요청이 한도를 함께 통과하지 않도록 회원 행을 먼저 잠급니다.
  await connection.query('SELECT id FROM member WHERE id = ? FOR UPDATE', [memberId]);
  const [[{ count }]] = await connection.query(
    'SELECT COUNT(*) AS count FROM activity_point_log WHERE member_id = ? AND action_type = ? AND created_at >= ?',
    [memberId, actionType, startOfKstDay(now)],
  );
  if (Number(count) >= DAILY_LIMITS[actionType]) return false;
  await awardActivityPoints(connection, memberId, [{ actionType, refId }]);
  return true;
}

/**
 * 삭제된 공고·댓글로 받은 점수를 같은 양만큼 회수합니다 (POST_REVOKE / COMMENT_REVOKE, 음수 point).
 * 점수를 받지 않은 글(하루 한도 초과)이나 이미 회수한 글은 건너뜁니다. 점수가 줄면 레벨도 내려갈 수 있습니다.
 * 레벨은 점수로 계산한 레벨이 줄어든 만큼만 내립니다 (점수 없이 레벨만 있던 기존 데이터 보호).
 * 호출하는 쪽의 트랜잭션 안에서 실행해야 합니다.
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {keyof typeof REVOKE_TYPES} actionType 회수할 지급 종류 (POST_CREATE / COMMENT_CREATE)
 * @param {number[]} refIds 삭제된 공고·댓글 id
 */
async function revokeActivityPoints(connection, actionType, refIds) {
  if (refIds.length === 0) return;
  const revokeType = REVOKE_TYPES[actionType];
  const [awarded] = await connection.query(
    'SELECT member_id AS memberId, ref_id AS refId, point FROM activity_point_log WHERE action_type = ? AND ref_id IN (?)',
    [actionType, refIds],
  );
  if (awarded.length === 0) return;

  // 여러 회원(대댓글 작성자들)의 점수를 바꿀 수 있으므로 id 순서로 잠가 교착을 피합니다.
  const memberIds = [...new Set(awarded.map((row) => row.memberId))].sort((a, b) => a - b);
  const [members] = await connection.query(
    'SELECT id, activity_point AS activityPoint, level FROM member WHERE id IN (?) ORDER BY id FOR UPDATE',
    [memberIds],
  );
  const [revoked] = await connection.query(
    'SELECT member_id AS memberId, ref_id AS refId FROM activity_point_log WHERE action_type = ? AND ref_id IN (?)',
    [revokeType, refIds],
  );
  const done = new Set(revoked.map((row) => `${row.memberId}:${row.refId}`));
  const pending = awarded.filter((row) => !done.has(`${row.memberId}:${row.refId}`));
  if (pending.length === 0) return;

  await connection.query('INSERT INTO activity_point_log (member_id, action_type, ref_id, point) VALUES ?', [
    pending.map((row) => [row.memberId, revokeType, row.refId, -row.point]),
  ]);

  for (const member of members) {
    const lost = pending.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + row.point, 0);
    if (lost === 0) continue;
    const activityPoint = Math.max(0, member.activityPoint - lost);
    const levelDrop = levelForPoints(member.activityPoint) - levelForPoints(activityPoint);
    const level = Math.max(MIN_LEVEL, member.level - levelDrop);
    await connection.query('UPDATE member SET activity_point = ?, level = ? WHERE id = ?', [activityPoint, level, member.id]);
  }
}

module.exports = {
  ACTIVITY_POINTS,
  DAILY_LIMITS,
  REVOKE_TYPES,
  MIN_LEVEL,
  MAX_LEVEL,
  levelForPoints,
  startOfKstDay,
  awardActivityPoints,
  awardDailyLimitedPoints,
  revokeActivityPoints,
};
