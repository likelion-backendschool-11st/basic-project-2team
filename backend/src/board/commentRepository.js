'use strict';

const { POST_STATUS } = require('./boardConstants');
const { COMMENT_STATUS } = require('./commentConstants');

/** 삭제되지 않은 공고 (소프트 삭제: deleted_at / status = DELETED) */
const ALIVE_POST = `p.deleted_at IS NULL AND p.status <> '${POST_STATUS.deleted}'`;
/** 삭제되지 않은 댓글. HIDDEN(관리자 가림)은 목록에 포함합니다. */
const ALIVE_COMMENT = `c.status <> '${COMMENT_STATUS.deleted}'`;

/** 루트 댓글 정렬. SQL 에 직접 들어가므로 이 목록의 값만 씁니다. */
const ROOT_ORDER = Object.freeze({
  oldest: 'c.created_at ASC, c.id ASC',
  newest: 'c.created_at DESC, c.id DESC',
});

/** 목록·작성 응답에 공통으로 쓰는 댓글 + 작성자 컬럼 */
const COMMENT_COLUMNS = `c.id, c.post_id AS postId, c.parent_id AS parentId, c.content, c.is_secret AS isSecret,
       c.status, c.created_at AS createdAt,
       m.id AS authorId, m.nickname AS authorNickname, m.avatar_url AS authorAvatarUrl, m.status AS authorStatus`;

/**
 * 댓글 조회·작성용 테이블 접근: comment · post · member
 * @param {import('mysql2/promise').Pool} pool
 */
function createCommentRepository(pool) {
  /** 댓글을 달 수 있는(삭제되지 않은) 공고의 id·작성자. 없으면 null */
  async function findPost(postId) {
    const [rows] = await pool.query(`SELECT p.id, p.author_id AS authorId FROM post p WHERE p.id = ? AND ${ALIVE_POST} LIMIT 1`, [
      postId,
    ]);
    return rows[0] ?? null;
  }

  /** 댓글 작성자의 계정 상태. 없으면 null */
  async function findMemberStatus(memberId) {
    const [rows] = await pool.query('SELECT status, suspended_until AS suspendedUntil FROM member WHERE id = ? LIMIT 1', [
      memberId,
    ]);
    return rows[0] ?? null;
  }

  /** 대댓글의 부모 후보: 같은 공고의 삭제되지 않은 댓글. 없으면 null */
  async function findParentComment(postId, commentId) {
    const [rows] = await pool.query(
      `SELECT c.id, c.parent_id AS parentId, c.author_id AS authorId
         FROM comment c WHERE c.id = ? AND c.post_id = ? AND ${ALIVE_COMMENT} LIMIT 1`,
      [commentId, postId],
    );
    return rows[0] ?? null;
  }

  /** 댓글 저장과 공고 comment_count +1 을 한 트랜잭션으로 처리하고 새 댓글 id 를 반환합니다. */
  async function createComment({ postId, authorId, parentId, content, isSecret }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        'INSERT INTO comment (post_id, author_id, parent_id, content, is_secret) VALUES (?, ?, ?, ?, ?)',
        [postId, authorId, parentId, content, isSecret],
      );
      await connection.query('UPDATE post SET comment_count = comment_count + 1 WHERE id = ?', [postId]);
      await connection.commit();
      return result.insertId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /** 댓글 한 건 + 작성자. 없으면 null */
  async function findCommentById(commentId) {
    const [rows] = await pool.query(
      `SELECT ${COMMENT_COLUMNS}
         FROM comment c JOIN member m ON m.id = c.author_id
        WHERE c.id = ? LIMIT 1`,
      [commentId],
    );
    return rows[0] ?? null;
  }

  /**
   * 루트 댓글 한 페이지와 루트 댓글 전체 수 (삭제된 루트 댓글은 대댓글과 함께 제외).
   * @param {{ postId: number, sort: 'oldest' | 'newest', limit: number, offset: number }} filter
   */
  async function findRootCommentPage({ postId, sort, limit, offset }) {
    const condition = `c.post_id = ? AND c.parent_id IS NULL AND ${ALIVE_COMMENT}`;
    const [[{ totalCount }]] = await pool.query(`SELECT COUNT(*) AS totalCount FROM comment c WHERE ${condition}`, [postId]);
    const [rows] = await pool.query(
      `SELECT ${COMMENT_COLUMNS}
         FROM comment c JOIN member m ON m.id = c.author_id
        WHERE ${condition}
        ORDER BY ${ROOT_ORDER[sort]}
        LIMIT ? OFFSET ?`,
      [postId, limit, offset],
    );
    return { rows, totalCount };
  }

  /** 여러 루트 댓글의 대댓글 (항상 등록순) */
  async function findReplies(parentIds) {
    if (parentIds.length === 0) return [];
    const [rows] = await pool.query(
      `SELECT ${COMMENT_COLUMNS}
         FROM comment c JOIN member m ON m.id = c.author_id
        WHERE c.parent_id IN (?) AND ${ALIVE_COMMENT}
        ORDER BY c.created_at ASC, c.id ASC`,
      [parentIds],
    );
    return rows;
  }

  return {
    findPost,
    findMemberStatus,
    findParentComment,
    createComment,
    findCommentById,
    findRootCommentPage,
    findReplies,
  };
}

module.exports = { createCommentRepository };
