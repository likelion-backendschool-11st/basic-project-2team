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
    // 파티 초대 알림에는 받은 사람의 그 공고 신청 상태를 붙입니다(ACCEPTED 면 이미 수락한 초대).
    const [rows] = await pool.query(
      `SELECT n.id, n.type, n.message, n.post_id AS postId, n.is_read AS isRead, n.created_at AS createdAt, pa.status AS applicationStatus
         FROM notification n
         LEFT JOIN post_application pa ON n.type = 'PARTY_INVITE' AND pa.post_id = n.post_id AND pa.applicant_id = n.member_id
        WHERE n.member_id = ?${unreadOnly ? ' AND n.is_read = FALSE' : ''} ORDER BY n.created_at DESC, n.id DESC LIMIT ? OFFSET ?`,
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

  /** 내 알림 하나를 삭제합니다. 내 알림이 아니거나 없으면 false */
  async function remove(memberId, notificationId) {
    const [result] = await pool.query('DELETE FROM notification WHERE id = ? AND member_id = ?', [notificationId, memberId]);
    return result.affectedRows > 0;
  }

  /** 내 관심 알림 설정 (게임·상세 분류 이름 포함, 게임 순서 → 등록 순) */
  async function findSubscriptions(memberId) {
    const [rows] = await pool.query(
      `SELECT s.id, g.code AS gameCode, g.name AS gameName, c.code AS detailCode, c.name AS detailName, s.enabled
         FROM notification_subscription s
         JOIN game g ON g.id = s.game_id
         LEFT JOIN game_content c ON c.id = s.game_content_id
        WHERE s.member_id = ?
        ORDER BY g.sort_order, g.id, s.id`,
      [memberId],
    );
    return rows;
  }

  async function findGameByCode(code) {
    const [[row]] = await pool.query('SELECT id FROM game WHERE code = ? AND is_active = TRUE', [code]);
    return row ?? null;
  }

  async function findGameContentByCode(gameId, code) {
    const [[row]] = await pool.query('SELECT id FROM game_content WHERE game_id = ? AND code = ?', [gameId, code]);
    return row ?? null;
  }

  /** 같은 대상의 설정이 있는지(NULL 은 UNIQUE 가 막지 못해 직접 검사) 와 내 설정 개수 */
  async function countSubscriptions(memberId) {
    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM notification_subscription WHERE member_id = ?', [memberId]);
    return count;
  }

  async function subscriptionExists(memberId, gameId, gameContentId) {
    const [[row]] = await pool.query(
      'SELECT id FROM notification_subscription WHERE member_id = ? AND game_id = ? AND game_content_id <=> ? LIMIT 1',
      [memberId, gameId, gameContentId],
    );
    return Boolean(row);
  }

  async function addSubscription(memberId, gameId, gameContentId) {
    const [result] = await pool.query('INSERT INTO notification_subscription (member_id, game_id, game_content_id) VALUES (?, ?, ?)', [
      memberId,
      gameId,
      gameContentId,
    ]);
    return result.insertId;
  }

  /** 내 설정 하나의 켜짐/꺼짐을 바꿉니다. 내 설정이 아니거나 없으면 false (같은 값이어도 true) */
  async function setSubscriptionEnabled(memberId, id, enabled) {
    const [[row]] = await pool.query('SELECT id FROM notification_subscription WHERE id = ? AND member_id = ?', [id, memberId]);
    if (!row) return false;
    await pool.query('UPDATE notification_subscription SET enabled = ? WHERE id = ? AND member_id = ?', [enabled, id, memberId]);
    return true;
  }

  async function removeSubscription(memberId, id) {
    const [result] = await pool.query('DELETE FROM notification_subscription WHERE id = ? AND member_id = ?', [id, memberId]);
    return result.affectedRows > 0;
  }

  return {
    findPage,
    countUnread,
    markRead,
    markAllRead,
    remove,
    findSubscriptions,
    findGameByCode,
    findGameContentByCode,
    countSubscriptions,
    subscriptionExists,
    addSubscription,
    setSubscriptionEnabled,
    removeSubscription,
  };
}

module.exports = { createNotificationRepository };
