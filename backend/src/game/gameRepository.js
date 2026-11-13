'use strict';

/**
 * game · game_content 테이블 조회.
 * @param {import('mysql2/promise').Pool} pool
 */
function createGameRepository(pool) {
  /** 활성 게임과 각 게임의 상세 콘텐츠를 평평한 행으로 반환합니다 (콘텐츠가 없는 게임은 content* 가 null). */
  async function findAllWithContents() {
    const [rows] = await pool.query(
      `SELECT g.code AS gameCode, g.name AS gameName, g.category_code AS categoryCode,
              c.code AS contentCode, c.name AS contentName, c.content_type AS contentType, c.max_headcount AS maxHeadcount
         FROM game g
         LEFT JOIN game_content c ON c.game_id = g.id
        WHERE g.is_active = TRUE
        ORDER BY g.sort_order, g.id, c.id`,
    );
    return rows;
  }

  return { findAllWithContents };
}

module.exports = { createGameRepository };
