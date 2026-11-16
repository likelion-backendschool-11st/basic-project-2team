import { notificationText, notificationTypes, unknownNotificationType, type NotificationType, type NotificationView } from '../data/notificationData';
import { request } from './http';

/** GET /api/notifications 아이템 (docs/API_SPEC.md 4절 알림함) */
export interface NotificationItem {
  readonly id: number;
  readonly type: NotificationType;
  readonly message: string;
  readonly postId: number | null;
  readonly read: boolean;
  readonly createdAt: string;
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
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGE_EVENT));

/** PATCH /api/notifications/{id}/read → 204 (이미 읽은 알림도 204) */
export const markNotificationRead = (id: string) => request<void>('PATCH', `/api/notifications/${id}/read`);

/** DELETE /api/notifications/{id} → 204 (복구 불가) */
export const deleteNotification = (id: string) => request<void>('DELETE', `/api/notifications/${id}`);

/** PATCH /api/notifications/read-all → 204 */
export const markAllNotificationsRead = () => request<void>('PATCH', '/api/notifications/read-all');

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
  };
}
