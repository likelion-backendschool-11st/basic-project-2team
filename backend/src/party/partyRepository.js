'use strict';

const { APPLICATION_STATUS: S, POST_STATUS } = require('./partyConstants');

const ALIVE_POST = "p.deleted_at IS NULL AND p.status <> 'DELETED'";
const APPLICANT_COLUMNS = `m.id AS memberId, m.nickname, m.avatar_url AS avatarUrl, m.level,
       m.manner_temp AS mannerTemp, m.review_count AS reviewCount, m.status AS memberStatus`;

/**
 * 참가 신청 · 승인/거절 · 파티원 조회용 테이블 접근: post_application · post · member
 * @param {import('mysql2/promise').Pool} pool
 */
function createPartyRepository(pool) {
  /** 삭제되지 않은 공고의 신청에 필요한 정보. 없으면 null */
  async function findPost(postId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.author_id AS authorId, p.status, p.headcount, p.current_count AS currentCount, p.schedule_at AS scheduleAt
         FROM post p WHERE p.id = ? AND ${ALIVE_POST} LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /** 신청자의 계정 상태. 없으면 null */
  async function findMemberStatus(memberId) {
    const [rows] = await pool.query('SELECT status, suspended_until AS suspendedUntil FROM member WHERE id = ? LIMIT 1', [memberId]);
    return rows[0] ?? null;
  }

  /** 이 공고에 내가 한 신청 → { id, status }. 없으면 null (UNIQUE(post_id, applicant_id) 라 최대 1건) */
  async function findMyApplication(postId, memberId) {
    const [rows] = await pool.query('SELECT id, status FROM post_application WHERE post_id = ? AND applicant_id = ? LIMIT 1', [
      postId,
      memberId,
    ]);
    return rows[0] ?? null;
  }

  /** 새 신청을 저장하고 id 를 돌려줍니다. 동시에 같은 신청이 들어와 UNIQUE 에 걸리면 null */
  async function createApplication({ postId, applicantId, role, message }) {
    try {
      const [result] = await pool.query('INSERT INTO post_application (post_id, applicant_id, role, message) VALUES (?, ?, ?, ?)', [
        postId,
        applicantId,
        role,
        message,
      ]);
      return result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return null;
      throw err;
    }
  }

  /** 취소했던 신청을 같은 행에서 다시 PENDING 으로 되돌립니다. 그 사이 상태가 바뀌었으면 false */
  async function reapply({ id, role, message }) {
    const [result] = await pool.query(
      `UPDATE post_application SET status = '${S.pending}', role = ?, message = ?, canceled_at = NULL, decided_at = NULL, late_cancel = FALSE
        WHERE id = ? AND status = '${S.canceled}'`,
      [role, message, id],
    );
    return result.affectedRows > 0;
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
   * 내 신청을 취소합니다. 수락된 신청이면 확정 인원(current_count)도 1 줄이고 lateCancel 을 기록합니다.
   * @returns {Promise<boolean>} 취소했으면 true, 취소할 신청(PENDING · ACCEPTED)이 없으면 false
   */
  async function cancelApplication({ postId, applicantId, canceledAt, lateCancel }) {
    return inTransaction(async (connection) => {
      // 인원 계산이 승인 처리와 겹치지 않게 공고 행부터 잠급니다.
      await connection.query('SELECT id FROM post WHERE id = ? FOR UPDATE', [postId]);
      const [rows] = await connection.query(
        'SELECT id, status FROM post_application WHERE post_id = ? AND applicant_id = ? FOR UPDATE',
        [postId, applicantId],
      );
      const application = rows[0];
      if (!application || ![S.pending, S.accepted].includes(application.status)) return false;

      const wasAccepted = application.status === S.accepted;
      await connection.query(
        `UPDATE post_application SET status = '${S.canceled}', canceled_at = ?, late_cancel = ? WHERE id = ?`,
        [canceledAt, wasAccepted && lateCancel, application.id],
      );
      if (wasAccepted) {
        await connection.query('UPDATE post SET current_count = GREATEST(current_count - 1, 1) WHERE id = ?', [postId]);
      }
      return true;
    });
  }

  /** 신청자 목록(취소·노쇼 제외, 오래된 순). status 를 주면 그 상태만 */
  async function findApplications(postId, status) {
    const [rows] = await pool.query(
      `SELECT a.id, a.status, a.role, a.message, a.created_at AS appliedAt, ${APPLICANT_COLUMNS}
         FROM post_application a JOIN member m ON m.id = a.applicant_id
        WHERE a.post_id = ? AND a.status IN (?) ORDER BY a.created_at ASC, a.id ASC`,
      [postId, status ? [status] : [S.pending, S.accepted, S.rejected]],
    );
    return rows;
  }

  /**
   * 신청을 승인/거절합니다. 공고 행을 잠근 채 상태·정원을 확인하므로 동시에 승인해도 정원을 넘지 않습니다.
   * @returns {Promise<{ result: 'OK' | 'NOT_FOUND' | 'ALREADY_DECIDED' | 'POST_CLOSED' | 'FULL', current?: number, max?: number }>}
   */
  async function decideApplication({ postId, applicationId, status, decidedAt }) {
    return inTransaction(async (connection) => {
      const [[post]] = await connection.query('SELECT status, headcount, current_count AS current FROM post WHERE id = ? FOR UPDATE', [postId]);
      const [[application]] = await connection.query('SELECT status FROM post_application WHERE id = ? AND post_id = ? FOR UPDATE', [
        applicationId,
        postId,
      ]);
      if (!post || !application) return { result: 'NOT_FOUND' };
      if (application.status !== S.pending) return { result: 'ALREADY_DECIDED' };

      let current = post.current;
      if (status === S.accepted) {
        if (post.status !== POST_STATUS.open) return { result: 'POST_CLOSED' };
        if (current >= post.headcount) return { result: 'FULL' };
        current += 1;
        await connection.query('UPDATE post SET current_count = ? WHERE id = ?', [current, postId]);
      }
      await connection.query('UPDATE post_application SET status = ?, decided_at = ? WHERE id = ?', [status, decidedAt, applicationId]);
      return { result: 'OK', current, max: post.headcount };
    });
  }

  /** 확정 파티원: 파티장 먼저, 이어서 수락된 신청자(수락 순) */
  async function findParticipants(postId) {
    const [rows] = await pool.query(
      `SELECT ${APPLICANT_COLUMNS}, NULL AS role, TRUE AS isHost, p.created_at AS joinedAt
         FROM post p JOIN member m ON m.id = p.author_id WHERE p.id = ? AND ${ALIVE_POST}
       UNION ALL
       SELECT ${APPLICANT_COLUMNS}, a.role, FALSE AS isHost, a.decided_at AS joinedAt
         FROM post_application a JOIN member m ON m.id = a.applicant_id
        WHERE a.post_id = ? AND a.status = '${S.accepted}'
       ORDER BY isHost DESC, joinedAt ASC`,
      [postId, postId],
    );
    return rows;
  }

  return {
    findPost,
    findMemberStatus,
    findMyApplication,
    createApplication,
    reapply,
    cancelApplication,
    findApplications,
    decideApplication,
    findParticipants,
  };
}

module.exports = { createPartyRepository };
