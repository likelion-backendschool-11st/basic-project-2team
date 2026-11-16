'use strict';

const { POST_STATUS } = require('../board/boardConstants');

/** 삭제되지 않은 공고 */
const ALIVE_POST = `p.deleted_at IS NULL AND p.status <> '${POST_STATUS.deleted}'`;

/** poll 행 → 서비스가 쓰는 컬럼 이름 */
const POLL_COLUMNS = `pl.id, pl.post_id AS postId, pl.author_id AS authorId, pl.title, pl.description,
       pl.is_multiple AS isMultiple, pl.commenters_only AS commentersOnly, pl.is_pinned AS isPinned,
       pl.closes_at AS closesAt, pl.final_option_id AS finalOptionId, pl.notice, pl.closed_at AS closedAt,
       pl.reminded_at AS remindedAt, pl.created_at AS createdAt`;

/**
 * 파티 의견 조율 투표 테이블 접근: poll · poll_option · poll_vote (+ post · post_application · member · comment · notification)
 * @param {import('mysql2/promise').Pool} pool
 */
function createPollRepository(pool) {
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

  async function insertOptions(connection, pollId, labels) {
    const rows = labels.map((label, index) => [pollId, label, index + 1]);
    await connection.query('INSERT INTO poll_option (poll_id, label, sort_order) VALUES ?', [rows]);
  }

  async function insertNotifications(connection, notifications) {
    if (notifications.length === 0) return;
    const rows = notifications.map((n) => [n.memberId, n.type, n.message, n.postId]);
    await connection.query('INSERT INTO notification (member_id, type, message, post_id) VALUES ?', [rows]);
  }

  /** 삭제되지 않은 공고의 작성자 · 제목 · 정원 · 현재 인원. 없으면 null */
  async function findPost(postId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.author_id AS authorId, p.title, p.headcount, p.current_count AS currentCount
         FROM post p WHERE p.id = ? AND ${ALIVE_POST} LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /** 공고의 가장 최근 투표. 없으면 null */
  async function findLatestPoll(postId) {
    const [rows] = await pool.query(`SELECT ${POLL_COLUMNS} FROM poll pl WHERE pl.post_id = ? ORDER BY pl.id DESC LIMIT 1`, [postId]);
    return rows[0] ?? null;
  }

  /** 투표 한 건. 공고가 삭제됐으면 null */
  async function findPollById(pollId) {
    const [rows] = await pool.query(
      `SELECT ${POLL_COLUMNS} FROM poll pl JOIN post p ON p.id = pl.post_id WHERE pl.id = ? AND ${ALIVE_POST} LIMIT 1`,
      [pollId],
    );
    return rows[0] ?? null;
  }

  /** 투표 항목 (표시 순서대로) */
  async function findOptions(pollId) {
    const [rows] = await pool.query(
      'SELECT id, label FROM poll_option WHERE poll_id = ? ORDER BY sort_order ASC, id ASC',
      [pollId],
    );
    return rows;
  }

  /** 투표 기록 + 투표한 회원 (한 회원이 복수 선택하면 여러 행) */
  async function findVotes(pollId) {
    const [rows] = await pool.query(
      `SELECT v.member_id AS memberId, v.option_id AS optionId, v.created_at AS votedAt,
              m.nickname, m.manner_temp AS mannerTemp, m.status AS memberStatus
         FROM poll_vote v JOIN member m ON m.id = v.member_id
        WHERE v.poll_id = ?
        ORDER BY v.created_at ASC, v.id ASC`,
      [pollId],
    );
    return rows;
  }

  /** 공대원: 파티장 + 수락된 신청자 (파티장이 먼저) */
  async function findPartyMembers(postId) {
    const [rows] = await pool.query(
      `SELECT m.id AS memberId, m.nickname, m.manner_temp AS mannerTemp, m.status AS memberStatus, TRUE AS isHost
         FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ?
       UNION ALL
       SELECT m.id, m.nickname, m.manner_temp, m.status, FALSE
         FROM post_application a JOIN member m ON m.id = a.applicant_id
        WHERE a.post_id = ? AND a.status = 'ACCEPTED'
       ORDER BY isHost DESC, memberId ASC`,
      [postId, postId],
    );
    return rows;
  }

  /** 이 공고에 삭제되지 않은 댓글을 남긴 회원 id 집합 (memberIds 안에서만) */
  async function findCommenterIds(postId, memberIds) {
    if (memberIds.length === 0) return new Set();
    const [rows] = await pool.query(
      `SELECT DISTINCT author_id AS memberId FROM comment
        WHERE post_id = ? AND status <> 'DELETED' AND author_id IN (?)`,
      [postId, memberIds],
    );
    return new Set(rows.map((row) => row.memberId));
  }

  /**
   * 투표와 항목을 한 트랜잭션으로 저장하고 새 투표 id 를 반환합니다.
   * 공고 행을 잠근 뒤 진행 중인(확정 전이고 마감 전인) 투표가 있으면 만들지 않고 null 을 돌려줍니다.
   */
  async function createPoll({ postId, authorId, title, description, multiple, commentersOnly, pinned, closesAt, options, now }) {
    return inTransaction(async (connection) => {
      await connection.query('SELECT id FROM post WHERE id = ? FOR UPDATE', [postId]);
      const [open] = await connection.query(
        'SELECT id FROM poll WHERE post_id = ? AND closed_at IS NULL AND closes_at > ? LIMIT 1',
        [postId, now],
      );
      if (open.length > 0) return null;
      const [result] = await connection.query(
        `INSERT INTO poll (post_id, author_id, title, description, is_multiple, commenters_only, is_pinned, closes_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [postId, authorId, title, description, multiple, commentersOnly, pinned, closesAt],
      );
      await insertOptions(connection, result.insertId, options);
      return result.insertId;
    });
  }

  /**
   * 아직 아무도 투표하지 않은 투표의 내용을 고치고 항목을 새로 만듭니다.
   * 그사이 누가 투표했으면(행 잠금 후 확인) 아무것도 바꾸지 않고 false 를 돌려줍니다.
   */
  async function updatePoll(pollId, { title, description, multiple, commentersOnly, pinned, closesAt, options }) {
    return inTransaction(async (connection) => {
      await connection.query('SELECT id FROM poll WHERE id = ? FOR UPDATE', [pollId]);
      const [[{ voteCount }]] = await connection.query('SELECT COUNT(*) AS voteCount FROM poll_vote WHERE poll_id = ?', [pollId]);
      if (voteCount > 0) return false;
      await connection.query(
        `UPDATE poll SET title = ?, description = ?, is_multiple = ?, commenters_only = ?, is_pinned = ?, closes_at = ?
          WHERE id = ?`,
        [title, description, multiple, commentersOnly, pinned, closesAt, pollId],
      );
      await connection.query('DELETE FROM poll_option WHERE poll_id = ?', [pollId]);
      await insertOptions(connection, pollId, options);
      return true;
    });
  }

  /** 회원의 투표를 optionIds 로 바꿉니다 (빈 배열이면 취소). poll 행을 잠가 결과 확정·편집과 겹치지 않게 합니다. */
  async function replaceVotes({ pollId, memberId, optionIds }) {
    return inTransaction(async (connection) => {
      const [[locked]] = await connection.query('SELECT closed_at AS closedAt FROM poll WHERE id = ? FOR UPDATE', [pollId]);
      if (!locked || locked.closedAt) return false;
      await connection.query('DELETE FROM poll_vote WHERE poll_id = ? AND member_id = ?', [pollId, memberId]);
      if (optionIds.length > 0) {
        await connection.query('INSERT INTO poll_vote (poll_id, option_id, member_id) VALUES ?', [
          optionIds.map((optionId) => [pollId, optionId, memberId]),
        ]);
      }
      return true;
    });
  }

  /** 상단 공지 고정 여부 */
  async function updatePinned(pollId, pinned) {
    await pool.query('UPDATE poll SET is_pinned = ? WHERE id = ?', [pinned, pollId]);
  }

  /**
   * 결과를 확정합니다. 안내 댓글(comment)과 알림(notifications)도 같은 트랜잭션으로 넣습니다.
   * 이미 확정된 투표면 아무것도 바꾸지 않고 false 를 돌려줍니다.
   */
  async function confirmPoll({ pollId, finalOptionId, notice, pinned, closedAt, comment, notifications }) {
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        `UPDATE poll SET final_option_id = ?, notice = ?, closed_at = ?, is_pinned = COALESCE(?, is_pinned)
          WHERE id = ? AND closed_at IS NULL`,
        [finalOptionId, notice, closedAt, pinned, pollId],
      );
      if (result.affectedRows === 0) return false;
      if (comment) {
        await connection.query('INSERT INTO comment (post_id, author_id, content) VALUES (?, ?, ?)', [
          comment.postId,
          comment.authorId,
          comment.content,
        ]);
        await connection.query('UPDATE post SET comment_count = comment_count + 1 WHERE id = ?', [comment.postId]);
      }
      await insertNotifications(connection, notifications);
      return true;
    });
  }

  /**
   * 미투표자 알림을 보내고 reminded_at 을 기록합니다. 마지막 알림이 remindableBefore 보다 늦으면(너무 잦으면) false.
   */
  async function remind({ pollId, remindedAt, remindableBefore, notifications }) {
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        'UPDATE poll SET reminded_at = ? WHERE id = ? AND (reminded_at IS NULL OR reminded_at <= ?)',
        [remindedAt, pollId, remindableBefore],
      );
      if (result.affectedRows === 0) return false;
      await insertNotifications(connection, notifications);
      return true;
    });
  }

  return {
    findPost,
    findLatestPoll,
    findPollById,
    findOptions,
    findVotes,
    findPartyMembers,
    findCommenterIds,
    createPoll,
    updatePoll,
    replaceVotes,
    updatePinned,
    confirmPoll,
    remind,
  };
}

module.exports = { createPollRepository };
