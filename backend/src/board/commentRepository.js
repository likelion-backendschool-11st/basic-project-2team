'use strict';

const { POST_STATUS } = require('./boardConstants');
const { COMMENT_STATUS, COMMENT_HIDE_REPORT_COUNT } = require('./commentConstants');
const { awardDailyLimitedPoints, revokeActivityPoints } = require('../common/activityPoint');

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
const COMMENT_COLUMNS = `c.id, c.post_id AS postId, c.parent_id AS parentId, c.accepted_reply_id AS acceptedReplyId, c.content, c.is_secret AS isSecret,
       c.is_party_only AS isPartyOnly, c.status, c.created_at AS createdAt,
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
      `SELECT c.id, c.parent_id AS parentId, c.author_id AS authorId, c.is_party_only AS isPartyOnly
         FROM comment c WHERE c.id = ? AND c.post_id = ? AND ${ALIVE_COMMENT} LIMIT 1`,
      [commentId, postId],
    );
    return rows[0] ?? null;
  }

  /**
   * 파티 확정 인원: 공고 작성자(공대장) + 승인(ACCEPTED)된 신청자. 참가자 전용 댓글의 권한 확인과 역할 표시에 씁니다.
   * @returns {Promise<Array<{ memberId: number, isHost: boolean, role: string | null, mannerTemp: number }>>}
   */
  async function findPartyMembers(postId) {
    const [rows] = await pool.query(
      `SELECT m.id AS memberId, TRUE AS isHost, NULL AS role, m.manner_temp AS mannerTemp
         FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
       UNION ALL
       SELECT m.id, FALSE, a.role, m.manner_temp
         FROM post_application a JOIN member m ON m.id = a.applicant_id
        WHERE a.post_id = ? AND a.status = 'ACCEPTED'`,
      [postId, postId],
    );
    return rows.map((row) => ({ ...row, isHost: Boolean(row.isHost), mannerTemp: Number(row.mannerTemp) }));
  }

  /**
   * 댓글 저장과 공고 comment_count +1 을 한 트랜잭션으로 처리하고 새 댓글 id 를 반환합니다.
   * 참가자 전용 댓글은 공개 목록·카드에 보이는 comment_count 에 넣지 않습니다.
   */
  async function createComment({ postId, authorId, parentId, content, isSecret, isPartyOnly = false }) {
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        'INSERT INTO comment (post_id, author_id, parent_id, content, is_secret, is_party_only) VALUES (?, ?, ?, ?, ?, ?)',
        [postId, authorId, parentId, content, isSecret, isPartyOnly],
      );
      if (!isPartyOnly) await connection.query('UPDATE post SET comment_count = comment_count + 1 WHERE id = ?', [postId]);
      // 댓글 작성 +2 (하루 10회까지, docs/03-db-design.md 결정 사항 8-1)
      await awardDailyLimitedPoints(connection, { memberId: authorId, actionType: 'COMMENT_CREATE', refId: result.insertId });
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
   * 한 채널의 루트 댓글 한 페이지와 루트 댓글 전체 수 (삭제된 루트 댓글은 대댓글과 함께 제외).
   * commentCount 는 그 채널의 살아 있는 댓글 수(답글 포함)입니다.
   * @param {{ postId: number, sort: 'oldest' | 'newest', limit: number, offset: number, partyOnly?: boolean }} filter
   */
  async function findRootCommentPage({ postId, sort, limit, offset, partyOnly = false }) {
    const channel = `c.post_id = ? AND c.is_party_only = ? AND ${ALIVE_COMMENT}`;
    const condition = `${channel} AND c.parent_id IS NULL`;
    const [[{ totalCount, commentCount }]] = await pool.query(
      `SELECT COALESCE(SUM(c.parent_id IS NULL), 0) AS totalCount, COUNT(*) AS commentCount FROM comment c WHERE ${channel}`,
      [postId, partyOnly],
    );
    const [rows] = await pool.query(
      `SELECT ${COMMENT_COLUMNS}
         FROM comment c JOIN member m ON m.id = c.author_id
        WHERE ${condition}
        ORDER BY ${ROOT_ORDER[sort]}
        LIMIT ? OFFSET ?`,
      [postId, partyOnly, limit, offset],
    );
    return { rows, totalCount: Number(totalCount), commentCount: Number(commentCount) };
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
      `SELECT ${COMMENT_COLUMNS}, p.author_id AS postAuthorId, pc.author_id AS parentAuthorId, pc.accepted_reply_id AS parentAcceptedReplyId
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

  /** 댓글의 채택 답글을 바꿉니다 (null 이면 채택 해제). 댓글 한 줄 UPDATE 라 교체가 원자적이고 댓글당 하나가 보장됩니다. */
  async function setAcceptedReply(commentId, replyId) {
    await pool.query('UPDATE comment SET accepted_reply_id = ? WHERE id = ?', [replyId, commentId]);
  }

  /**
   * 댓글 본문 수정. 채택된 답글을 고치면 채택한 사람이 확인하지 못한 내용이 채택된 채로 남지 않도록 같은 트랜잭션에서 채택을 먼저 풉니다.
   * @returns {Promise<boolean>} 채택이 풀렸으면 true
   */
  async function updateCommentContent(commentId, content) {
    return inTransaction(async (connection) => {
      const [cleared] = await connection.query('UPDATE comment SET accepted_reply_id = NULL WHERE accepted_reply_id = ?', [commentId]);
      await connection.query('UPDATE comment SET content = ? WHERE id = ?', [content, commentId]);
      return cleared.affectedRows > 0;
    });
  }

  /**
   * 댓글과 그 대댓글을 소프트 삭제하고, 삭제된 수만큼 공고 comment_count 를 줄입니다 (참가자 전용 댓글은 세지 않았으므로 그대로 둠).
   * 삭제된 댓글마다 작성자(대댓글은 각자의 작성자)가 받은 작성 점수를 회수합니다.
   * @returns {Promise<number>} 삭제된 댓글 수
   */
  async function deleteCommentWithReplies({ commentId, postId, deletedAt, isPartyOnly = false }) {
    return inTransaction(async (connection) => {
      const [targets] = await connection.query(
        `SELECT c.id FROM comment c WHERE (c.id = ? OR c.parent_id = ?) AND ${ALIVE_COMMENT} FOR UPDATE`,
        [commentId, commentId],
      );
      const ids = targets.map((row) => row.id);
      if (ids.length === 0) return 0;
      const [result] = await connection.query(
        `UPDATE comment c SET c.status = '${COMMENT_STATUS.deleted}', c.deleted_at = ? WHERE c.id IN (?)`,
        [deletedAt, ids],
      );
      const count = result.affectedRows;
      if (count > 0) {
        if (!isPartyOnly) {
          await connection.query(
            'UPDATE post SET comment_count = IF(comment_count > ?, comment_count - ?, 0) WHERE id = ?',
            [count, count, postId],
          );
        }
        await revokeActivityPoints(connection, 'COMMENT_CREATE', ids);
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

  /**
   * 회원 신고를 저장합니다 (target_id 는 신고 대상 회원 id). 같은 사람이 이미 신고했으면(report UNIQUE) null.
   * @returns {Promise<number | null>} 새 신고 id
   */
  async function createMemberReport({ reporterId, targetMemberId, reasonCode, detail }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO report (reporter_id, target_type, target_id, target_member_id, post_id, reason_code, detail)
         VALUES (?, 'MEMBER', ?, ?, NULL, ?, ?)`,
        [reporterId, targetMemberId, targetMemberId, reasonCode, detail],
      );
      return result.insertId;
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
    findPartyMembers,
    createComment,
    findCommentById,
    findRootCommentPage,
    findReplies,
    findCommentContext,
    setAcceptedReply,
    updateCommentContent,
    deleteCommentWithReplies,
    createCommentReport,
    createMemberReport,
    findReportedCommentIds,
  };
}

module.exports = { createCommentRepository };
