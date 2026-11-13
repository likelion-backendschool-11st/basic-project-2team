'use strict';

/**
 * post · post_tag · tag · game · game_content 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
const { POST_STATUS_DELETED, POST_STATUS_OPEN, POST_STATUS_CLOSED, POST_STATUS_COMPLETED } = require('./postConstants');

function createPostRepository(pool) {
  /** 게임 코드 → { id, categoryCode }. 없거나 비활성이면 null */
  async function findGameByCode(code) {
    const [rows] = await pool.query(
      'SELECT id, category_code AS categoryCode FROM game WHERE code = ? AND is_active = TRUE LIMIT 1',
      [code],
    );
    return rows[0] ?? null;
  }

  /** 게임 안의 상세 콘텐츠 코드 → { id, type(소문자), maxHeadcount }. 없으면 null */
  async function findGameContent(gameId, code) {
    const [rows] = await pool.query(
      'SELECT id, LOWER(content_type) AS type, max_headcount AS maxHeadcount FROM game_content WHERE game_id = ? AND code = ? LIMIT 1',
      [gameId, code],
    );
    return rows[0] ?? null;
  }

  /** 태그를 없으면 만들고 공고에 연결합니다. */
  async function attachTags(connection, postId, tags) {
    if (tags.length === 0) return;
    await connection.query('INSERT IGNORE INTO tag (name) VALUES ?', [tags.map((name) => [name])]);
    const [tagRows] = await connection.query('SELECT id FROM tag WHERE name IN (?)', [tags]);
    await connection.query('INSERT INTO post_tag (post_id, tag_id) VALUES ?', [tagRows.map((row) => [postId, row.id])]);
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

      await attachTags(connection, postId, tags);

      // 등록한 글의 임시저장은 더 이어 쓸 일이 없으므로 같은 트랜잭션에서 지웁니다.
      await connection.query('DELETE FROM post_draft WHERE member_id = ?', [post.authorId]);

      await connection.commit();
      return postId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /** 임시저장(회원당 1개)을 덮어씁니다. 내용이 같아도 저장 시각은 갱신합니다. */
  async function saveDraft(memberId, payload) {
    await pool.query(
      `INSERT INTO post_draft (member_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [memberId, JSON.stringify(payload)],
    );
    return findDraft(memberId);
  }

  /** 내 임시저장 → { payload, savedAt }. 없으면 null */
  async function findDraft(memberId) {
    const [rows] = await pool.query('SELECT payload, updated_at AS savedAt FROM post_draft WHERE member_id = ? LIMIT 1', [memberId]);
    return rows[0] ?? null;
  }

  /** 삭제되지 않은 공고의 작성자와 상태 → { authorId, status, scheduleAt }. 없거나 삭제됐으면 null */
  async function findPostAuthor(postId) {
    const [rows] = await pool.query(
      `SELECT author_id AS authorId, status, schedule_at AS scheduleAt FROM post WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}' LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /**
   * 공고 내용을 바꾸고 태그를 교체합니다. 행을 잠가 확정 인원·상태를 다시 확인합니다.
   * 모집 중인데 인원을 확정 인원까지 줄이면 모집 마감으로 바꿉니다.
   * @returns {Promise<{ result: 'OK' | 'NOT_FOUND' | 'NOT_EDITABLE' | 'HEADCOUNT_BELOW', currentCount?: number }>}
   */
  async function updatePost({ postId, post, tags }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[row]] = await connection.query(
        `SELECT status, current_count AS currentCount FROM post
          WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}' FOR UPDATE`,
        [postId],
      );
      if (!row) {
        await connection.rollback();
        return { result: 'NOT_FOUND' };
      }
      if (row.status === POST_STATUS_COMPLETED) {
        await connection.rollback();
        return { result: 'NOT_EDITABLE' };
      }
      if (post.headcount < row.currentCount) {
        await connection.rollback();
        return { result: 'HEADCOUNT_BELOW', currentCount: row.currentCount };
      }
      const status = row.status === POST_STATUS_OPEN && post.headcount === row.currentCount ? POST_STATUS_CLOSED : row.status;
      await connection.query(
        `UPDATE post SET category_code = ?, game_id = ?, game_content_id = ?, party_type = ?, title = ?, body = ?,
                         party_name = ?, play_style = ?, headcount = ?, schedule_at = ?, voice_required = ?, status = ?
          WHERE id = ?`,
        [
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
          status,
          postId,
        ],
      );
      await connection.query('DELETE FROM post_tag WHERE post_id = ?', [postId]);
      await attachTags(connection, postId, tags);
      await connection.commit();
      return { result: 'OK' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 공고를 소프트 삭제(status = DELETED, deleted_at)하고 스크랩을 정리합니다. 신청·댓글·리뷰는 그대로 둡니다.
   * @returns {Promise<boolean>} 삭제했으면 true, 그 사이 이미 삭제됐으면 false
   */
  async function softDeletePost(postId, deletedAt) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `UPDATE post SET status = '${POST_STATUS_DELETED}', deleted_at = ?
          WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}'`,
        [deletedAt, postId],
      );
      if (result.affectedRows > 0) await connection.query('DELETE FROM post_scrap WHERE post_id = ?', [postId]);
      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return { findGameByCode, findGameContent, createPost, saveDraft, findDraft, findPostAuthor, updatePost, softDeletePost };
}

module.exports = { createPostRepository };
