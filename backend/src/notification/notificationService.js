'use strict';

const { ApiError } = require('../common/ApiError');
const { MAX_SUBSCRIPTIONS, PARTY_INVITE_TYPE, notificationMessages: m } = require('./notificationConstants');
const { parseId, parseListQuery, parseSubscriptionBody, parseEnabledBody } = require('./notificationValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * 알림함 조회·읽음 처리·삭제 비즈니스 로직 (docs/API_SPEC.md 4절).
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
        // 파티 초대만: 이미 수락해 파티원이 됐는지 (공고가 지워졌으면 수락할 수 없으므로 null)
        invite: row.type === PARTY_INVITE_TYPE && row.postId ? { joined: row.applicationStatus === 'ACCEPTED' } : null,
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

  /** DELETE /api/notifications/:id — 읽음 처리와 같은 이유로 남의 알림은 404 */
  async function remove(memberId, rawId) {
    const id = parseId(rawId);
    if (id === null || !(await notificationRepository.remove(memberId, id))) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', m.notFound);
    }
  }

  const toSubscription = (row) => ({
    id: row.id,
    game: row.gameCode,
    gameName: row.gameName,
    detail: row.detailCode ?? null,
    detailName: row.detailName ?? null,
    enabled: Boolean(row.enabled),
  });

  const subscriptionNotFound = () => new ApiError(404, 'SUBSCRIPTION_NOT_FOUND', m.subscriptionNotFound);

  /** GET /api/notifications/subscriptions */
  async function listSubscriptions(memberId) {
    return (await notificationRepository.findSubscriptions(memberId)).map(toSubscription);
  }

  /** POST /api/notifications/subscriptions — 게임(선택: 상세 분류) 하나를 관심 알림으로 등록 */
  async function addSubscription(memberId, body) {
    const { game, detail } = parseSubscriptionBody(body);
    const gameRow = await notificationRepository.findGameByCode(game);
    if (!gameRow) throw new ApiError(404, 'GAME_NOT_FOUND', m.gameNotFound);
    let contentId = null;
    if (detail !== null) {
      const content = await notificationRepository.findGameContentByCode(gameRow.id, detail);
      if (!content) throw new ApiError(404, 'GAME_CONTENT_NOT_FOUND', m.detailNotFound);
      contentId = content.id;
    }
    if ((await notificationRepository.countSubscriptions(memberId)) >= MAX_SUBSCRIPTIONS) {
      throw new ApiError(409, 'SUBSCRIPTION_LIMIT', m.subscriptionLimit);
    }
    if (await notificationRepository.subscriptionExists(memberId, gameRow.id, contentId)) {
      throw new ApiError(409, 'SUBSCRIPTION_EXISTS', m.subscriptionExists);
    }
    return { id: await notificationRepository.addSubscription(memberId, gameRow.id, contentId) };
  }

  /** PATCH /api/notifications/subscriptions/:id { enabled } */
  async function setSubscriptionEnabled(memberId, rawId, body) {
    const id = parseId(rawId);
    const enabled = parseEnabledBody(body);
    if (id === null || !(await notificationRepository.setSubscriptionEnabled(memberId, id, enabled))) throw subscriptionNotFound();
  }

  /** DELETE /api/notifications/subscriptions/:id */
  async function removeSubscription(memberId, rawId) {
    const id = parseId(rawId);
    if (id === null || !(await notificationRepository.removeSubscription(memberId, id))) throw subscriptionNotFound();
  }

  return { list, unreadCount, markRead, markAllRead, remove, listSubscriptions, addSubscription, setSubscriptionEnabled, removeSubscription };
}

module.exports = { createNotificationService };
