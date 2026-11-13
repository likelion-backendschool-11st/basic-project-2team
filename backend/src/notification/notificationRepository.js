'use strict';

/**
 * 알림함 테이블 접근: notification (내 알림만 다룹니다. 모든 쿼리에 member_id 조건이 있습니다)
 * @param {import('mysql2/promise').Pool} pool
 */
function createNotificationRepository(pool) {
  /** 내 알림 한 페이지(최신순)와 조건에 맞는 전체 건수 */
  async function findPage({ memberId, unreadOnly, limit, offset }) {
    const where = `member_id = ?${unreadOnly ? ' AND is_read = FALSE' : ''}`;
    const [[{ totalCount }]] = await pool.query(`SELECT COUNT(*) AS totalCount FROM notification WHERE ${where}`, [memberId]);
    const [rows] = await pool.query(
      `SELECT id, type, message, post_id AS postId, is_read AS isRead, created_at AS createdAt
         FROM notification WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [memberId, limit, offset],
    );
    return { rows, totalCount };
  }

  /** 안 읽은 알림 수 (idx_notification_member_read_created 를 탑니다) */
  async function countUnread(memberId) {
    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM notification WHERE member_id = ? AND is_read = FALSE', [memberId]);
    return count;
  }

  /** 내 알림 하나를 읽음 처리합니다. 내 알림이 아니거나 없으면 false (이미 읽은 알림은 true) */
  async function markRead(memberId, notificationId) {
    const [result] = await pool.query('UPDATE notification SET is_read = TRUE WHERE id = ? AND member_id = ?', [notificationId, memberId]);
    return result.affectedRows > 0;
  }

  /** 내 안 읽은 알림을 모두 읽음 처리합니다. */
  async function markAllRead(memberId) {
    await pool.query('UPDATE notification SET is_read = TRUE WHERE member_id = ? AND is_read = FALSE', [memberId]);
  }

  return { findPage, countUnread, markRead, markAllRead };
}

module.exports = { createNotificationRepository };
