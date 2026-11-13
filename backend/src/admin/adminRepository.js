'use strict';

const { reportStatus, postStatus, commentStatus, COMMENT_REPORTED } = require('./adminConstants');

/** LIKE 검색어의 %, _ 를 글자 그대로 찾도록 이스케이프합니다. */
const likePattern = (q) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/** WHERE 조건 목록을 SQL 로 합칩니다. */
const whereClause = (conditions) => (conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '');

/** 관리자 목록의 댓글 상태 필터 → SQL 조건 (REPORTED = VISIBLE + 신고 1건 이상) */
const commentStatusConditions = Object.freeze({
  [commentStatus.visible]: `c.status = '${commentStatus.visible}' AND c.report_count = 0`,
  [COMMENT_REPORTED]: `c.status = '${commentStatus.visible}' AND c.report_count > 0`,
  [commentStatus.hidden]: `c.status = '${commentStatus.hidden}'`,
  [commentStatus.deleted]: `c.status = '${commentStatus.deleted}'`,
});

/**
 * 관리자 화면용 조회와 관리자 처리(신고·공고·회원·댓글) 저장.
 * 컬럼은 SQL 별칭으로 camelCase 로 바꿔 돌려줍니다. DECIMAL 은 문자열, BOOLEAN 은 0/1 로 오므로 서비스에서 변환합니다.
 * @param {import('mysql2/promise').Pool} pool
 */
function createAdminRepository(pool) {
  /** db 는 pool 또는 트랜잭션 connection. 같은 메서드를 트랜잭션 안팎에서 씁니다. */
  function build(db) {
    const rowsOf = async (sql, params) => (await db.query(sql, params))[0];
    const firstOf = async (sql, params) => (await rowsOf(sql, params))[0] ?? null;

    /** 목록 + 전체 건수 */
    async function page({ select, from, conditions, params, orderBy, offset, limit }) {
      const where = whereClause(conditions);
      const items = await rowsOf(`SELECT ${select} FROM ${from} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [
        ...params,
        limit,
        offset,
      ]);
      const { totalCount } = await firstOf(`SELECT COUNT(*) AS totalCount FROM ${from} ${where}`, params);
      return { items, totalCount: Number(totalCount) };
    }

    // ───────── 관리자 계정 · 이력

    async function findAdminById(id) {
      return firstOf('SELECT id, login_id AS loginId, name, role, status FROM admin_account WHERE id = ?', [id]);
    }

    async function findAdminByLoginId(loginId) {
      return firstOf(
        `SELECT id, login_id AS loginId, password_hash AS passwordHash, name, role, status
           FROM admin_account WHERE login_id = ?`,
        [loginId],
      );
    }

    async function recordAdminLogin({ adminId, now }) {
      await db.query('UPDATE admin_account SET last_login_at = ? WHERE id = ?', [now, adminId]);
    }

    /** admin_action_log 는 추가만 합니다 (docs/03-db-design.md 2.13절). */
    async function insertActionLog({ adminId, actionType, targetType, targetId, detail, ip }) {
      await db.query(
        `INSERT INTO admin_action_log (admin_id, action_type, target_type, target_id, detail, ip)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, actionType, targetType, targetId, detail ? JSON.stringify(detail) : null, ip ?? null],
      );
    }

    async function listActionLogs({ actionTypes, offset, limit }) {
      const conditions = [];
      const params = [];
      if (actionTypes) {
        conditions.push('l.action_type IN (?)');
        params.push(actionTypes);
      }
      return page({
        select: `l.id, l.created_at AS createdAt, l.action_type AS actionType, l.target_type AS targetType,
                 l.target_id AS targetId, l.detail, l.admin_id AS adminId, a.name AS adminName`,
        from: 'admin_action_log l JOIN admin_account a ON a.id = l.admin_id',
        conditions,
        params,
        orderBy: 'l.created_at DESC, l.id DESC',
        offset,
        limit,
      });
    }

    async function listActionLogsByTarget({ targetType, targetId, limit }) {
      return rowsOf(
        `SELECT l.id, l.created_at AS createdAt, l.action_type AS actionType, l.detail, a.name AS adminName
           FROM admin_action_log l JOIN admin_account a ON a.id = l.admin_id
          WHERE l.target_type = ? AND l.target_id = ?
          ORDER BY l.created_at DESC, l.id DESC
          LIMIT ?`,
        [targetType, targetId, limit],
      );
    }

    async function insertNotification({ memberId, type, message, postId }) {
      await db.query('INSERT INTO notification (member_id, type, message, post_id) VALUES (?, ?, ?, ?)', [
        memberId,
        type,
        message,
        postId ?? null,
      ]);
    }

    // ───────── 대시보드

    async function getDashboardCounts({ todayStart, recentSince }) {
      return firstOf(
        `SELECT
           (SELECT COUNT(*) FROM report WHERE status IN (?, ?)) AS pendingReportCount,
           (SELECT COUNT(*) FROM report WHERE created_at >= ?) AS todayReportCount,
           (SELECT COUNT(*) FROM post WHERE status = ?) AS openPostCount,
           (SELECT COUNT(*) FROM sanction WHERE created_at >= ?) AS recentSanctionCount`,
        [reportStatus.pending, reportStatus.inProgress, todayStart, postStatus.open, recentSince],
      );
    }

    async function listRecentSanctions(limit) {
      return rowsOf(
        `SELECT s.id, s.member_id AS memberId, m.nickname, m.login_id AS loginId, s.type, s.reason,
                s.starts_at AS startsAt, s.ends_at AS endsAt, s.created_at AS createdAt
           FROM sanction s JOIN member m ON m.id = s.member_id
          ORDER BY s.created_at DESC, s.id DESC
          LIMIT ?`,
        [limit],
      );
    }

    // ───────── 신고

    async function listReports({ status, type, offset, limit }) {
      const conditions = [];
      const params = [];
      if (status) {
        conditions.push('r.status = ?');
        params.push(status);
      }
      if (type) {
        conditions.push('r.target_type = ?');
        params.push(type);
      }
      return page({
        select: `r.id, r.created_at AS createdAt, r.target_type AS targetType, r.target_id AS targetId,
                 r.reason_code AS reasonCode, r.status, r.target_member_id AS targetMemberId,
                 tm.nickname AS targetNickname, r.reporter_id AS reporterId, rp.nickname AS reporterNickname`,
        from: `report r
               JOIN member tm ON tm.id = r.target_member_id
               JOIN member rp ON rp.id = r.reporter_id`,
        conditions,
        params,
        orderBy: 'r.created_at DESC, r.id DESC',
        offset,
        limit,
      });
    }

    async function findReportById(id) {
      return firstOf(
        `SELECT r.id, r.created_at AS createdAt, r.target_type AS targetType, r.target_id AS targetId,
                r.reason_code AS reasonCode, r.detail, r.status, r.action, r.admin_memo AS adminMemo,
                r.handled_at AS handledAt, a.name AS handledByName,
                r.reporter_id AS reporterId, rp.nickname AS reporterNickname, rp.login_id AS reporterLoginId,
                r.target_member_id AS targetMemberId, tm.nickname AS targetNickname, tm.login_id AS targetLoginId,
                tm.manner_temp AS targetMannerTemp, tm.status AS targetStatus,
                r.post_id AS postId, p.title AS postTitle,
                c.content AS commentContent
           FROM report r
           JOIN member rp ON rp.id = r.reporter_id
           JOIN member tm ON tm.id = r.target_member_id
           LEFT JOIN post p ON p.id = r.post_id
           LEFT JOIN comment c ON r.target_type = 'COMMENT' AND c.id = r.target_id
           LEFT JOIN admin_account a ON a.id = r.handled_by
          WHERE r.id = ?`,
        [id],
      );
    }

    /** 처리 중 다른 관리자가 같은 신고를 바꾸지 못하게 행을 잠급니다 (트랜잭션 안에서 호출). */
    async function lockReport(id) {
      return firstOf(
        `SELECT id, status, target_type AS targetType, target_id AS targetId,
                target_member_id AS targetMemberId, reason_code AS reasonCode
           FROM report WHERE id = ? FOR UPDATE`,
        [id],
      );
    }

    async function updateReport({ id, status, action, memo, adminId, handledAt }) {
      await db.query(
        `UPDATE report
            SET status = ?, action = ?, admin_memo = COALESCE(?, admin_memo), handled_by = ?, handled_at = ?
          WHERE id = ?`,
        [status, action, memo, adminId, handledAt, id],
      );
    }

    // ───────── 공고

    const postListSelect = `p.id, p.created_at AS createdAt, p.category_code AS category, g.name AS gameName,
      p.party_type AS partyType, gc.name AS contentName, p.title, p.author_id AS authorId,
      m.nickname AS authorNickname, p.current_count AS currentCount, p.headcount, p.status,
      (SELECT COUNT(*) FROM report r WHERE r.target_type = 'POST' AND r.target_id = p.id) AS reportCount`;
    const postFrom = `post p
      JOIN game g ON g.id = p.game_id
      LEFT JOIN game_content gc ON gc.id = p.game_content_id
      JOIN member m ON m.id = p.author_id`;

    async function listPosts({ status, q, offset, limit }) {
      const conditions = [];
      const params = [];
      if (status) {
        conditions.push('p.status = ?');
        params.push(status);
      }
      if (q) {
        conditions.push('(p.title LIKE ? OR m.nickname LIKE ?)');
        params.push(likePattern(q), likePattern(q));
      }
      return page({
        select: postListSelect,
        from: postFrom,
        conditions,
        params,
        orderBy: 'p.created_at DESC, p.id DESC',
        offset,
        limit,
      });
    }

    async function findPostById(id) {
      return firstOf(
        `SELECT ${postListSelect},
                p.body, p.party_name AS partyName, p.play_style AS playStyle, p.required_spec AS requiredSpec,
                p.schedule_at AS scheduleAt, p.voice_required AS voiceRequired, p.view_count AS viewCount,
                p.comment_count AS commentCount, p.updated_at AS updatedAt,
                m.login_id AS authorLoginId, m.manner_temp AS authorMannerTemp,
                p.deleted_at AS deletedAt, p.delete_reason AS deleteReason, da.name AS deletedByName
           FROM ${postFrom}
           LEFT JOIN admin_account da ON da.id = p.deleted_by_admin_id
          WHERE p.id = ?`,
        [id],
      );
    }

    async function lockPost(id) {
      return firstOf('SELECT id, author_id AS authorId, title, status FROM post WHERE id = ? FOR UPDATE', [id]);
    }

    async function deletePost({ id, adminId, reason, now }) {
      await db.query(
        'UPDATE post SET status = ?, deleted_at = ?, deleted_by_admin_id = ?, delete_reason = ? WHERE id = ?',
        [postStatus.deleted, now, adminId, reason, id],
      );
    }

    // ───────── 회원

    async function listMembers({ status, q, offset, limit }) {
      const conditions = [];
      const params = [];
      if (status) {
        conditions.push('m.status = ?');
        params.push(status);
      }
      if (q) {
        conditions.push('(m.nickname LIKE ? OR m.login_id LIKE ? OR m.email LIKE ?)');
        params.push(likePattern(q), likePattern(q), likePattern(q));
      }
      return page({
        select: `m.id, m.nickname, m.login_id AS loginId, m.created_at AS createdAt,
                 m.last_login_at AS lastLoginAt, m.manner_temp AS mannerTemp, m.status,
                 m.suspended_until AS suspendedUntil,
                 (SELECT COUNT(*) FROM report r WHERE r.target_member_id = m.id) AS reportCount,
                 (SELECT COUNT(*) FROM sanction s WHERE s.member_id = m.id) AS sanctionCount`,
        from: 'member m',
        conditions,
        params,
        orderBy: 'm.created_at DESC, m.id DESC',
        offset,
        limit,
      });
    }

    async function findMemberById(id) {
      return firstOf(
        `SELECT m.id, m.login_id AS loginId, m.nickname, m.email, m.phone, m.name, m.age_range AS ageRange,
                m.bio, m.avatar_url AS avatarUrl, m.status, m.suspended_until AS suspendedUntil,
                m.manner_temp AS mannerTemp, m.review_count AS reviewCount, m.level,
                m.created_at AS createdAt, m.last_login_at AS lastLoginAt, m.withdrawn_at AS withdrawnAt,
                (SELECT COUNT(*) FROM post p WHERE p.author_id = m.id AND p.status <> 'DELETED') AS postCount,
                (SELECT COUNT(*) FROM post_application pa
                  WHERE pa.applicant_id = m.id AND pa.status = 'ACCEPTED') AS partyCount,
                (SELECT COUNT(*) FROM post_application pa
                  WHERE pa.applicant_id = m.id AND pa.status = 'NO_SHOW') AS noShowCount,
                (SELECT COUNT(*) FROM report r WHERE r.target_member_id = m.id) AS reportCount
           FROM member m
          WHERE m.id = ?`,
        [id],
      );
    }

    async function listGameProfiles(memberId) {
      return rowsOf(
        `SELECT g.name AS gameName, gp.is_main AS isMain, gp.character_name AS characterName,
                gp.play_time_slot AS playTimeSlot, gp.play_style AS playStyle
           FROM member_game_profile gp JOIN game g ON g.id = gp.game_id
          WHERE gp.member_id = ?
          ORDER BY gp.is_main DESC, g.sort_order`,
        [memberId],
      );
    }

    async function listSanctionsByMember(memberId) {
      return rowsOf(
        `SELECT s.id, s.type, s.reason, s.starts_at AS startsAt, s.ends_at AS endsAt, s.report_id AS reportId,
                s.released_at AS releasedAt, a.name AS adminName, s.created_at AS createdAt
           FROM sanction s JOIN admin_account a ON a.id = s.admin_id
          WHERE s.member_id = ?
          ORDER BY s.created_at DESC, s.id DESC`,
        [memberId],
      );
    }

    async function lockMember(id) {
      return firstOf(
        'SELECT id, nickname, status, suspended_until AS suspendedUntil FROM member WHERE id = ? FOR UPDATE',
        [id],
      );
    }

    async function updateMemberStatus({ id, status, suspendedUntil }) {
      await db.query('UPDATE member SET status = ?, suspended_until = ? WHERE id = ?', [status, suspendedUntil, id]);
    }

    /** @returns {Promise<number>} 새 sanction id */
    async function insertSanction({ memberId, type, reason, startsAt, endsAt, reportId, adminId }) {
      const [result] = await db.query(
        `INSERT INTO sanction (member_id, type, reason, starts_at, ends_at, report_id, admin_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [memberId, type, reason, startsAt, endsAt, reportId ?? null, adminId],
      );
      return result.insertId;
    }

    // ───────── 댓글

    async function listComments({ status, q, offset, limit }) {
      const conditions = [];
      const params = [];
      if (status) conditions.push(commentStatusConditions[status]);
      if (q) {
        conditions.push('(c.content LIKE ? OR m.nickname LIKE ?)');
        params.push(likePattern(q), likePattern(q));
      }
      return page({
        select: `c.id, c.created_at AS createdAt, c.post_id AS postId, p.title AS postTitle, c.parent_id AS parentId,
                 c.author_id AS authorId, m.nickname AS authorNickname, c.content, c.is_secret AS isSecret,
                 c.status, c.report_count AS reportCount`,
        from: `comment c
               JOIN post p ON p.id = c.post_id
               JOIN member m ON m.id = c.author_id`,
        conditions,
        params,
        orderBy: 'c.created_at DESC, c.id DESC',
        offset,
        limit,
      });
    }

    async function lockComment(id) {
      return firstOf(
        `SELECT id, post_id AS postId, author_id AS authorId, content, status
           FROM comment WHERE id = ? FOR UPDATE`,
        [id],
      );
    }

    async function updateCommentStatus({ id, status, deletedAt }) {
      await db.query('UPDATE comment SET status = ?, deleted_at = COALESCE(?, deleted_at) WHERE id = ?', [
        status,
        deletedAt,
        id,
      ]);
    }

    /** 댓글 삭제 시 공고의 댓글 수를 줄입니다 (UNSIGNED 라 0 아래로 내려가지 않게). */
    async function decrementCommentCount(postId) {
      await db.query('UPDATE post SET comment_count = IF(comment_count > 0, comment_count - 1, 0) WHERE id = ?', [
        postId,
      ]);
    }

    return {
      findAdminById,
      findAdminByLoginId,
      recordAdminLogin,
      insertActionLog,
      listActionLogs,
      listActionLogsByTarget,
      insertNotification,
      getDashboardCounts,
      listRecentSanctions,
      listReports,
      findReportById,
      lockReport,
      updateReport,
      listPosts,
      findPostById,
      lockPost,
      deletePost,
      listMembers,
      findMemberById,
      listGameProfiles,
      listSanctionsByMember,
      lockMember,
      updateMemberStatus,
      insertSanction,
      listComments,
      lockComment,
      updateCommentStatus,
      decrementCommentCount,
    };
  }

  /** fn(tx) 를 한 트랜잭션으로 실행합니다. tx 는 이 repository 와 같은 메서드를 가집니다. */
  async function withTransaction(fn) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(build(connection));
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return { ...build(pool), withTransaction };
}

module.exports = { createAdminRepository };
