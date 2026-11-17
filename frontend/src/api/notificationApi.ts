import {
  notificationText,
  notificationTypes,
  unknownNotificationType,
  type NotificationType,
  type NotificationView,
  type SubscriptionView,
} from '../data/notificationData';
import { request } from './http';

/** GET /api/notifications 아이템 (docs/API_SPEC.md 4절 알림함) */
export interface NotificationItem {
  readonly id: number;
  readonly type: NotificationType;
  readonly message: string;
  readonly postId: number | null;
  readonly read: boolean;
  readonly createdAt: string;
  /** PARTY_INVITE 만: 이미 수락했는지 (공고가 지워졌으면 null) */
  readonly invite: { readonly joined: boolean } | null;
}

export interface NotificationPage {
  readonly items: readonly NotificationItem[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
  /** unread 필터와 상관없는 내 전체 안 읽은 알림 수 */
  readonly unreadCount: number;
}

export const getNotifications = (page: number, size: number, unreadOnly: boolean) =>
  request<NotificationPage>('GET', `/api/notifications?page=${page}&size=${size}${unreadOnly ? '&unread=true' : ''}`);

/** GET /api/notifications/unread-count — 안 읽은 알림 수 (헤더 배지용) */
export const getUnreadCount = () => request<{ readonly count: number }>('GET', '/api/notifications/unread-count').then((res) => res.count);

/** 알림을 읽거나 지운 뒤 보내는 이벤트. 헤더 배지가 이것을 받아 안 읽은 수를 다시 가져옵니다. */
export const NOTIFICATIONS_CHANGE_EVENT = 'notifications-change';
/** 헤더가 안 읽은 알림 수가 달라진 것을 알아챘을 때 보내는 이벤트(새 알림 도착, 다른 탭·기기에서 읽음). 열려 있는 알림 목록이 받아 다시 불러옵니다. */
export const UNREAD_COUNT_CHANGED_EVENT = 'notifications-unread-count-changed';

export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGE_EVENT));

/** PATCH /api/notifications/{id}/read → 204 (이미 읽은 알림도 204) */
export const markNotificationRead = (id: string) => request<void>('PATCH', `/api/notifications/${id}/read`);

/** DELETE /api/notifications/{id} → 204 (복구 불가) */
export const deleteNotification = (id: string) => request<void>('DELETE', `/api/notifications/${id}`);

/** PATCH /api/notifications/read-all → 204 */
export const markAllNotificationsRead = () => request<void>('PATCH', '/api/notifications/read-all');

/** GET /api/notifications/subscriptions 아이템 (docs/API_SPEC.md 4절 알림함) */
export interface SubscriptionItem {
  readonly id: number;
  readonly game: string;
  readonly gameName: string;
  readonly detail: string | null;
  readonly detailName: string | null;
  readonly enabled: boolean;
}

export const getSubscriptions = () => request<readonly SubscriptionItem[]>('GET', '/api/notifications/subscriptions');
export const addSubscription = (game: string, detail: string | null) =>
  request<{ readonly id: number }>('POST', '/api/notifications/subscriptions', detail ? { game, detail } : { game });
export const setSubscriptionEnabled = (id: number, enabled: boolean) => request<void>('PATCH', `/api/notifications/subscriptions/${id}`, { enabled });
export const deleteSubscription = (id: number) => request<void>('DELETE', `/api/notifications/subscriptions/${id}`);

export const toSubscriptionView = (item: SubscriptionItem): SubscriptionView => ({
  id: item.id,
  name: item.detailName ? `${item.gameName} · ${item.detailName}` : item.gameName,
  enabled: item.enabled,
});

const MINUTE = 60_000;

/** 지난 시각 → `방금 전` · `N분 전` · `N시간 전` · `N일 전` */
function timeAgo(iso: string, now: Date) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE);
  if (minutes < 1) return notificationText.justNow;
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}

export function toNotificationView(item: NotificationItem, now: Date = new Date()): NotificationView {
  const meta = notificationTypes[item.type] ?? unknownNotificationType;
  return {
    id: String(item.id),
    message: item.message,
    typeLabel: meta.label,
    icon: meta.icon,
    tone: meta.tone,
    timeAgo: timeAgo(item.createdAt, now),
    read: item.read,
    postId: item.postId,
    invite: item.invite ?? null,
  };
}
