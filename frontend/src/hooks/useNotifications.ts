import { useCallback, useEffect, useState } from 'react';
import { errorMessageOf, hasAccessToken } from '../api/http';
import { getNotifications, toNotificationView } from '../api/notificationApi';
import { NOTIFICATION_PAGE_SIZE, notificationText, type NotificationView } from '../data/notificationData';

/**
 * 알림 목록(GET /api/notifications). 전체 / 안 읽은 알림 필터와 서버 페이지네이션을 씁니다.
 * 응답이 늦게 도착한 이전 요청은 무시합니다. `reload()` 는 지금 조건으로 다시 불러옵니다.
 */
export function useNotifications() {
  const [unreadOnly, setUnreadOnlyState] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<readonly NotificationView[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loggedIn = hasAccessToken();

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getNotifications(page, NOTIFICATION_PAGE_SIZE, unreadOnly)
      .then((res) => {
        if (cancelled) return;
        // 마지막 페이지의 알림이 모두 사라졌으면 남은 마지막 페이지로 옮깁니다.
        if (res.totalPages > 0 && page > res.totalPages) {
          setPage(res.totalPages);
          return;
        }
        const now = new Date();
        setItems(res.items.map((item) => toNotificationView(item, now)));
        setTotalPages(Math.max(1, res.totalPages));
        setUnreadCount(res.unreadCount);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessageOf(err, notificationText.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, page, unreadOnly, reloadKey]);

  const setUnreadOnly = (next: boolean) => {
    if (next === unreadOnly) return;
    setUnreadOnlyState(next);
    setPage(1);
  };

  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const size = Math.min(5, totalPages);
  const start = Math.min(Math.max(1, page - Math.floor(size / 2)), totalPages - size + 1);

  return {
    loggedIn,
    unreadOnly,
    setUnreadOnly,
    items,
    unreadCount,
    loading,
    error,
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
    pager: {
      page,
      pages: Array.from({ length: size }, (_, i) => start + i),
      hasPrev: page > 1,
      hasNext: page < totalPages,
      onPrev: () => goTo(page - 1),
      onNext: () => goTo(page + 1),
      onGoTo: goTo,
    },
  };
}
