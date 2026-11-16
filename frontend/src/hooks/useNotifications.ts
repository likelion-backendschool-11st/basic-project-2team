import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessageOf, hasAccessToken } from '../api/http';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead, toNotificationView } from '../api/notificationApi';
import { NOTIFICATION_PAGE_SIZE, notificationText, type NotificationView } from '../data/notificationData';
import { paths } from '../data/routes';

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const loggedIn = hasAccessToken();
  const navigate = useNavigate();
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

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

  /**
   * 알림을 누르면 읽음 처리하고, 연결된 공고가 있으면 그 상세로 이동합니다(postId 가 null 이면 읽음만).
   * 화면은 바로 읽음으로 바꾸고, 서버 요청이 실패하면 목록을 다시 불러와 되돌립니다.
   */
  const markRead = (item: NotificationView) => {
    if (item.read) return;
    setActionError(null);
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    markNotificationRead(item.id).catch((err: unknown) => {
      setActionError(errorMessageOf(err, notificationText.markFailed));
      reload();
    });
  };

  const open = (item: NotificationView) => {
    markRead(item);
    if (item.postId !== null) navigate(paths.postDetail(String(item.postId)));
  };

  /** 알림 삭제(복구 불가). 화면에서 바로 빼고, 끝나면 목록을 다시 불러와 다음 알림으로 빈자리를 채웁니다. */
  const remove = (item: NotificationView) => {
    setActionError(null);
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    if (!item.read) setUnreadCount((c) => Math.max(0, c - 1));
    deleteNotification(item.id)
      .catch((err: unknown) => setActionError(errorMessageOf(err, notificationText.deleteFailed)))
      .finally(reload);
  };

  /** 「모두 읽음」: 서버에서 처리한 뒤 목록을 다시 불러옵니다(안 읽은 알림 필터에서는 목록이 비게 됩니다). */
  const markAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllNotificationsRead();
      reload();
    } catch (err) {
      setActionError(errorMessageOf(err, notificationText.markFailed));
    } finally {
      setMarkingAll(false);
    }
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
    reload,
    actionError,
    markingAll,
    open,
    markRead,
    remove,
    markAllRead,
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
