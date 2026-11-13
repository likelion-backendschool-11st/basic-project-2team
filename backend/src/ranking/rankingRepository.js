'use strict';

const { RANKED_MEMBER_STATUS } = require('./rankingConstants');

/**
 * 매너 랭킹 조회: member · member_game_profile · game · review · review_tag_map · review_tag
 * @param {import('mysql2/promise').Pool} pool
 */
function createRankingRepository(pool) {
  /** 매너 온도 상위 회원 (정상 회원 중 평가를 1건 이상 받은 회원). (status, manner_temp) 인덱스를 씁니다. */
  async function findMannerRanking(limit) {
    const [rows] = await pool.query(
      `SELECT m.id, m.nickname, m.avatar_url AS avatarUrl, m.level, m.manner_temp AS mannerTemp,
              m.review_count AS reviewCount, mg.code AS mainGameCode, mg.name AS mainGameName
         FROM member m
         LEFT JOIN member_game_profile mgp
                ON mgp.id = (SELECT x.id FROM member_game_profile x
                              WHERE x.member_id = m.id AND x.is_main = TRUE ORDER BY x.id LIMIT 1)
         LEFT JOIN game mg ON mg.id = mgp.game_id
        WHERE m.status = ? AND m.review_count > 0
        ORDER BY m.manner_temp DESC, m.review_count DESC, m.id
        LIMIT ?`,
      [RANKED_MEMBER_STATUS, limit],
    );
    return rows;
  }

  /** 회원별로 가장 많이 받은 평가 태그 1개: Map<memberId, { code, label }> */
  async function findTopTagByMember(memberIds) {
    if (memberIds.length === 0) return new Map();
    const [rows] = await pool.query(
      `SELECT r.target_id AS memberId, rt.code, rt.label, COUNT(*) AS count
         FROM review r
         JOIN review_tag_map rtm ON rtm.review_id = r.id
         JOIN review_tag rt ON rt.id = rtm.review_tag_id
        WHERE r.target_id IN (?)
        GROUP BY r.target_id, rt.id, rt.code, rt.label, rt.sort_order
        ORDER BY r.target_id, count DESC, rt.sort_order, rt.id`,
      [memberIds],
    );
    const topTags = new Map();
    for (const row of rows) {
      if (!topTags.has(row.memberId)) topTags.set(row.memberId, { code: row.code, label: row.label });
    }
    return topTags;
  }

  return { findMannerRanking, findTopTagByMember };
}

module.exports = { createRankingRepository };
