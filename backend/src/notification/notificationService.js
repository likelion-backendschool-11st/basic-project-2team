'use strict';

const { ApiError } = require('../common/ApiError');
const { notificationMessages: m } = require('./notificationConstants');
const { parseId, parseListQuery } = require('./notificationValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * 알림함 조회·읽음 처리 비즈니스 로직 (docs/API_SPEC.md 4절).
 * @param {{ notificationRepository: ReturnType<typeof import('./notificationRepository').createNotificationRepository> }} deps
 */
function createNotificationService({ notificationRepository }) {
  /** GET /api/notifications — 최신순 목록과 안 읽은 알림 수 */
  async function list(memberId, query) {
    const { page, size, unreadOnly } = parseListQuery(query);
    const [{ rows, totalCount }, unreadCount] = await Promise.all([
      notificationRepository.findPage({ memberId, unreadOnly, limit: size, offset: (page - 1) * size }),
      notificationRepository.countUnread(memberId),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        postId: row.postId ?? null,
        read: Boolean(row.isRead),
        createdAt: toIso(row.createdAt),
      })),
      page,
      size,
      totalCount,
      totalPages: Math.ceil(totalCount / size),
      unreadCount,
    };
  }

  /** GET /api/notifications/unread-count — 헤더 배지 폴링용 */
  async function unreadCount(memberId) {
    return { count: await notificationRepository.countUnread(memberId) };
  }

  /** PATCH /api/notifications/:id/read — 남의 알림은 존재 여부를 알리지 않도록 404 */
  async function markRead(memberId, rawId) {
    const id = parseId(rawId);
    if (id === null || !(await notificationRepository.markRead(memberId, id))) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', m.notFound);
    }
  }

  /** PATCH /api/notifications/read-all */
  async function markAllRead(memberId) {
    await notificationRepository.markAllRead(memberId);
  }

  return { list, unreadCount, markRead, markAllRead };
}

module.exports = { createNotificationService };
