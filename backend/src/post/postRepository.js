'use strict';

/**
 * post · post_tag · tag · game · game_content 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
function createPostRepository(pool) {
  /** 게임 코드 → { id, categoryCode }. 없거나 비활성이면 null */
  async function findGameByCode(code) {
    const [rows] = await pool.query(
      'SELECT id, category_code AS categoryCode FROM game WHERE code = ? AND is_active = TRUE LIMIT 1',
      [code],
    );
    return rows[0] ?? null;
  }

  /** 게임 안의 상세 콘텐츠 코드 → id. 없으면 null */
  async function findGameContentId(gameId, code) {
    const [rows] = await pool.query('SELECT id FROM game_content WHERE game_id = ? AND code = ? LIMIT 1', [
      gameId,
      code,
    ]);
    return rows[0]?.id ?? null;
  }

  /** 공고와 태그 연결을 한 트랜잭션으로 저장하고 새 공고 id 를 반환합니다. */
  async function createPost({ post, tags }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO post (author_id, category_code, game_id, game_content_id, party_type, title, body,
                           party_name, play_style, headcount, schedule_at, voice_required)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post.authorId,
          post.categoryCode,
          post.gameId,
          post.gameContentId,
          post.partyType,
          post.title,
          post.body,
          post.partyName,
          post.playStyle,
          post.headcount,
          post.scheduleAt,
          post.voiceRequired,
        ],
      );
      const postId = result.insertId;

      if (tags.length > 0) {
        await connection.query('INSERT IGNORE INTO tag (name) VALUES ?', [tags.map((name) => [name])]);
        const [tagRows] = await connection.query('SELECT id FROM tag WHERE name IN (?)', [tags]);
        await connection.query('INSERT INTO post_tag (post_id, tag_id) VALUES ?', [
          tagRows.map((row) => [postId, row.id]),
        ]);
      }

      await connection.commit();
      return postId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return { findGameByCode, findGameContentId, createPost };
}

module.exports = { createPostRepository };
