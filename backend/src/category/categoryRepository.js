'use strict';

/** @param {import('mysql2/promise').Pool} pool */
function createCategoryRepository(pool) {
  /** 활성 카테고리와 삭제되지 않은 공고 수 */
  async function findAllWithPostCount() {
    const [rows] = await pool.query(
      `SELECT c.code, c.name, COUNT(p.id) AS postCount
         FROM category c
         LEFT JOIN post p ON p.category_code = c.code AND p.deleted_at IS NULL AND p.status <> 'DELETED'
        WHERE c.is_active = TRUE
        GROUP BY c.code, c.name, c.sort_order
        ORDER BY c.sort_order, c.code`,
    );
    return rows.map((row) => ({ code: row.code, name: row.name, postCount: Number(row.postCount) }));
  }

  return { findAllWithPostCount };
}

module.exports = { createCategoryRepository };
