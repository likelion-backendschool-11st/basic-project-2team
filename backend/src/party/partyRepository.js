'use strict';

const { APPLICATION_STATUS: S, POST_STATUS, NOTIFICATION_TYPE } = require('./partyConstants');
const { awardActivityPoints } = require('../common/activityPoint');

const ALIVE_POST = "p.deleted_at IS NULL AND p.status <> 'DELETED'";
/** 활동 완료 시 점수를 받을 파티원: 승인된 신청자 중 탈퇴하지 않은 회원 */
const ACCEPTED_MEMBERS_SQL = `SELECT pa.applicant_id AS memberId
   FROM post_application pa
   JOIN member m ON m.id = pa.applicant_id
  WHERE pa.post_id = ? AND pa.status = '${S.accepted}' AND m.status <> 'WITHDRAWN'`;
const APPLICANT_COLUMNS = `m.id AS memberId, m.nickname, m.avatar_url AS avatarUrl, m.level,
       m.manner_temp AS mannerTemp, m.review_count AS reviewCount, m.status AS memberStatus`;

/**
 * 참가 신청 · 승인/거절 · 파티원 조회용 테이블 접근: post_application · post · member
 * @param {import('mysql2/promise').Pool} pool
 */
function createPartyRepository(pool) {
  /** 알림함에 한 건 추가. 호출한 트랜잭션 안에서 실행되므로 원래 작업이 롤백되면 알림도 함께 사라집니다. */
  async function insertNotification(connection, { memberId, type, message, postId }) {
    await connection.query('INSERT INTO notification (member_id, type, message, post_id) VALUES (?, ?, ?, ?)', [memberId, type, message, postId]);
  }

  /** 이 공고에 대기 중·수락된 신청자 전원에게 같은 알림을 보냅니다 (statuses 로 대상 상태를 좁힐 수 있음). */
  async function notifyApplicants(connection, { postId, type, message, statuses }) {
    await connection.query(
      `INSERT INTO notification (member_id, type, message, post_id)
       SELECT applicant_id, ?, ?, post_id FROM post_application WHERE post_id = ? AND status IN (?)`,
      [type, message, postId, statuses],
    );
  }

  /** 삭제되지 않은 공고의 신청에 필요한 정보. 없으면 null */
  async function findPost(postId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.author_id AS authorId, p.title, p.status, p.headcount, p.current_count AS currentCount, p.schedule_at AS scheduleAt
         FROM post p WHERE p.id = ? AND ${ALIVE_POST} LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /** 신청자의 계정 상태. 없으면 null */
  async function findMemberStatus(memberId) {
    const [rows] = await pool.query('SELECT nickname, status, suspended_until AS suspendedUntil FROM member WHERE id = ? LIMIT 1', [memberId]);
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
  async function createApplication({ postId, applicantId, role, message, notice }) {
    try {
      return await inTransaction(async (connection) => {
        const [result] = await connection.query('INSERT INTO post_application (post_id, applicant_id, role, message) VALUES (?, ?, ?, ?)', [
          postId,
          applicantId,
          role,
          message,
        ]);
        await insertNotification(connection, { ...notice, postId });
        return result.insertId;
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return null;
      throw err;
    }
  }

  /**
   * 취소했던 신청을 같은 행에서 다시 PENDING 으로 되돌립니다. 그 사이 상태가 바뀌었으면 false.
   * 취소 기록(late_cancel · canceled_at)은 지우지 않습니다. 직전 취소 이력을 재신청으로 지울 수 없게 하기 위해서입니다.
   */
  async function reapply({ id, role, message, postId, notice }) {
    return inTransaction(async (connection) => {
      const [result] = await connection.query(
        `UPDATE post_application SET status = '${S.pending}', role = ?, message = ?, decided_at = NULL
          WHERE id = ? AND status = '${S.canceled}'`,
        [role, message, id],
      );
      if (result.affectedRows === 0) return false;
      await insertNotification(connection, { ...notice, postId });
      return true;
    });
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
  async function cancelApplication({ postId, applicantId, canceledAt, lateCancel, notice }) {
    return inTransaction(async (connection) => {
      // 인원 계산이 승인 처리와 겹치지 않게 공고 행부터 잠급니다.
      const [[post]] = await connection.query('SELECT status, headcount, current_count AS current FROM post WHERE id = ? FOR UPDATE', [postId]);
      const [rows] = await connection.query(
        'SELECT id, status FROM post_application WHERE post_id = ? AND applicant_id = ? FOR UPDATE',
        [postId, applicantId],
      );
      const application = rows[0];
      if (!application || ![S.pending, S.accepted].includes(application.status)) return false;

      const wasAccepted = application.status === S.accepted;
      await connection.query(
        `UPDATE post_application SET status = '${S.canceled}', canceled_at = ?, late_cancel = (late_cancel OR ?) WHERE id = ?`,
        [canceledAt, wasAccepted && lateCancel, application.id],
      );
      if (wasAccepted) {
        await insertNotification(connection, { ...notice, postId }); // 수락됐던 파티원이 빠지면 파티장에게 알립니다.
        // 정원이 차서 마감된 공고에서 자리가 나면 다시 모집 중으로 돌립니다.
        const reopen = post.status === POST_STATUS.closed && post.current >= post.headcount;
        await connection.query(`UPDATE post SET current_count = GREATEST(current_count - 1, 1)${reopen ? `, status = '${POST_STATUS.open}'` : ''} WHERE id = ?`, [postId]);
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
  async function decideApplication({ postId, applicationId, status, decidedAt, notices }) {
    return inTransaction(async (connection) => {
      const [[post]] = await connection.query('SELECT status, headcount, current_count AS current FROM post WHERE id = ? FOR UPDATE', [postId]);
      const [[application]] = await connection.query('SELECT status, applicant_id AS applicantId FROM post_application WHERE id = ? AND post_id = ? FOR UPDATE', [
        applicationId,
        postId,
      ]);
      if (!post || !application) return { result: 'NOT_FOUND' };
      if (application.status !== S.pending) return { result: 'ALREADY_DECIDED' };

      let current = post.current;
      let postStatus = post.status;
      if (status === S.accepted) {
        if (current >= post.headcount) return { result: 'FULL' };
        if (post.status !== POST_STATUS.open) return { result: 'POST_CLOSED' };
        current += 1;
        // 모집 인원이 모두 차면 공고를 마감합니다 (REQ-POST-007).
        postStatus = current >= post.headcount ? POST_STATUS.closed : post.status;
        await connection.query('UPDATE post SET current_count = ?, status = ? WHERE id = ?', [current, postStatus, postId]);
      }
      await connection.query('UPDATE post_application SET status = ?, decided_at = ? WHERE id = ?', [status, decidedAt, applicationId]);
      await insertNotification(connection, {
        memberId: application.applicantId,
        type: NOTIFICATION_TYPE.applicationResult,
        message: status === S.accepted ? notices.accepted : notices.rejected,
        postId,
      });
      // 이 승인으로 정원이 차서 마감됐다면, 아직 결과를 기다리는 신청자에게 알립니다.
      if (postStatus === POST_STATUS.closed && post.status !== POST_STATUS.closed) {
        await notifyApplicants(connection, { postId, type: NOTIFICATION_TYPE.postUpdated, message: notices.closed, statuses: [S.pending] });
      }
      return { result: 'OK', current, max: post.headcount, postStatus };
    });
  }

  /**
   * 작성자가 공고의 모집 상태를 바꿉니다. 완료(COMPLETED)된 공고는 되돌릴 수 없고, 정원이 찬 공고는 다시 열 수 없습니다.
   * 완료 처리는 승인된 파티원(탈퇴 제외)이 있고 출발 시간이 지난 뒤(일정 미정이면 제외)에만 가능합니다.
   * 완료하면 같은 트랜잭션에서 파티장과 승인된 파티원에게 활동 점수(PARTY_COMPLETE)를 지급합니다.
   * @returns {Promise<{ result: 'OK' | 'NOT_FOUND' | 'COMPLETED' | 'FULL' | 'NO_MEMBERS' | 'NOT_STARTED', status?: string, current?: number, max?: number }>}
   */
  async function changePostStatus({ postId, status, now, notice }) {
    return inTransaction(async (connection) => {
      const [[post]] = await connection.query(
        `SELECT author_id AS authorId, status, headcount, current_count AS current, schedule_at AS scheduleAt FROM post p WHERE p.id = ? AND ${ALIVE_POST} FOR UPDATE`,
        [postId],
      );
      if (!post) return { result: 'NOT_FOUND' };
      const unchanged = { result: 'OK', status: post.status, current: post.current, max: post.headcount };
      if (post.status === status) return unchanged;
      if (post.status === POST_STATUS.completed) return { result: 'COMPLETED' };
      if (status === POST_STATUS.open && post.current >= post.headcount) return { result: 'FULL' };
      let accepted = [];
      if (status === POST_STATUS.completed) {
        [accepted] = await connection.query(ACCEPTED_MEMBERS_SQL, [postId]);
        if (accepted.length === 0) return { result: 'NO_MEMBERS' };
        if (post.scheduleAt && new Date(post.scheduleAt) > now) return { result: 'NOT_STARTED' };
      }
      await connection.query('UPDATE post SET status = ? WHERE id = ?', [status, postId]);
      if (status === POST_STATUS.completed) {
        // 리뷰 저장(reviewRepository)과 같은 순서(id 오름차순)로 회원 행을 잠가 교착을 막습니다.
        const memberIds = [post.authorId, ...accepted.map((row) => row.memberId)].sort((a, b) => a - b);
        await connection.query('SELECT id FROM member WHERE id IN (?) ORDER BY id FOR UPDATE', [memberIds]);
        for (const memberId of memberIds) {
          await awardActivityPoints(connection, memberId, [{ actionType: 'PARTY_COMPLETE', refId: postId }]);
        }
      }
      // 마감·완료는 대기 중이거나 수락된 신청자에게 알립니다 (모집 재개는 알리지 않음).
      if (notice) {
        await notifyApplicants(connection, { postId, type: NOTIFICATION_TYPE.postUpdated, message: notice, statuses: [S.pending, S.accepted] });
      }
      return { ...unchanged, status };
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
    changePostStatus,
    findParticipants,
  };
}

module.exports = { createPartyRepository };
