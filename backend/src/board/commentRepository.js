'use strict';

const { POST_STATUS } = require('./boardConstants');
const { COMMENT_STATUS, COMMENT_HIDE_REPORT_COUNT } = require('./commentConstants');

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
 * 댓글 조회·작성·수정·삭제·신고용 테이블 접근: comment · post · member · report
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
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        'INSERT INTO comment (post_id, author_id, parent_id, content, is_secret) VALUES (?, ?, ?, ?, ?)',
        [postId, authorId, parentId, content, isSecret],
      );
      await connection.query('UPDATE post SET comment_count = comment_count + 1 WHERE id = ?', [postId]);
      return result.insertId;
    });
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

  /** 트랜잭션 하나로 fn(connection) 을 실행합니다. 실패하면 롤백합니다. */
  async function inTransaction(fn) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 수정·삭제·신고 대상 댓글 + 작성자 + 공고 작성자·부모 댓글 작성자.
   * 댓글이 삭제됐거나 공고가 삭제됐으면 null
   */
  async function findCommentContext(commentId) {
    const [rows] = await pool.query(
      `SELECT ${COMMENT_COLUMNS}, p.author_id AS postAuthorId, pc.author_id AS parentAuthorId
         FROM comment c
         JOIN member m ON m.id = c.author_id
         JOIN post p ON p.id = c.post_id
         LEFT JOIN comment pc ON pc.id = c.parent_id
        WHERE c.id = ? AND ${ALIVE_COMMENT} AND ${ALIVE_POST}
        LIMIT 1`,
      [commentId],
    );
    return rows[0] ?? null;
  }

  /** 댓글 본문 수정 */
  async function updateCommentContent(commentId, content) {
    await pool.query('UPDATE comment SET content = ? WHERE id = ?', [content, commentId]);
  }

  /**
   * 댓글과 그 대댓글을 소프트 삭제하고, 삭제된 수만큼 공고 comment_count 를 줄입니다.
   * @returns {Promise<number>} 삭제된 댓글 수
   */
  async function deleteCommentWithReplies({ commentId, postId, deletedAt }) {
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        `UPDATE comment c SET c.status = '${COMMENT_STATUS.deleted}', c.deleted_at = ?
          WHERE (c.id = ? OR c.parent_id = ?) AND ${ALIVE_COMMENT}`,
        [deletedAt, commentId, commentId],
      );
      const count = result.affectedRows;
      if (count > 0) {
        await connection.query(
          'UPDATE post SET comment_count = IF(comment_count > ?, comment_count - ?, 0) WHERE id = ?',
          [count, count, postId],
        );
      }
      return count;
    });
  }

  /**
   * 댓글 신고를 저장하고 report_count 를 올립니다. 신고자 수가 기준 이상이면 VISIBLE 댓글을 HIDDEN 으로 바꿉니다.
   * 같은 사람이 이미 신고했으면(report UNIQUE) null 을 돌려줍니다.
   * @returns {Promise<number | null>} 새 신고 id
   */
  async function createCommentReport({ reporterId, commentId, targetMemberId, postId, reasonCode, detail }) {
    try {
      return await inTransaction(async (connection) => {
        const [result] = await connection.query(
          `INSERT INTO report (reporter_id, target_type, target_id, target_member_id, post_id, reason_code, detail)
           VALUES (?, 'COMMENT', ?, ?, ?, ?, ?)`,
          [reporterId, commentId, targetMemberId, postId, reasonCode, detail],
        );
        // MySQL 은 SET 을 왼쪽부터 계산하므로 status 를 먼저 두어 증가 전 report_count 로 판단합니다.
        await connection.query(
          `UPDATE comment
              SET status = IF(status = '${COMMENT_STATUS.visible}' AND report_count + 1 >= ?, '${COMMENT_STATUS.hidden}', status),
                  report_count = report_count + 1
            WHERE id = ?`,
          [COMMENT_HIDE_REPORT_COUNT, commentId],
        );
        return result.insertId;
      });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') return null;
      throw err;
    }
  }

  /** 로그인한 사용자가 신고한 댓글 id 집합 (목록의 reported 표시용) */
  async function findReportedCommentIds(memberId, commentIds) {
    if (commentIds.length === 0) return new Set();
    const [rows] = await pool.query(
      `SELECT target_id AS commentId FROM report
        WHERE reporter_id = ? AND target_type = 'COMMENT' AND target_id IN (?)`,
      [memberId, commentIds],
    );
    return new Set(rows.map((row) => row.commentId));
  }

  return {
    findPost,
    findMemberStatus,
    findParentComment,
    createComment,
    findCommentById,
    findRootCommentPage,
    findReplies,
    findCommentContext,
    updateCommentContent,
    deleteCommentWithReplies,
    createCommentReport,
    findReportedCommentIds,
  };
}

module.exports = { createCommentRepository };
