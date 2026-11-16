import { useEffect, useState } from 'react';
import { getUnreadCount, NOTIFICATIONS_CHANGE_EVENT } from '../api/notificationApi';
import { useAuth } from './useAuth';

const POLL_INTERVAL_MS = 30_000;

/**
 * 헤더 알림 배지용 안 읽은 알림 수. 로그인했을 때만 조회하고, 30초마다·탭으로 돌아왔을 때·알림을 읽거나 지웠을 때 다시 가져옵니다.
 * 조회에 실패하면 직전 값을 그대로 둡니다(배지는 부가 정보). 로그아웃하면 0 입니다.
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const memberId = user?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (memberId === null) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      getUnreadCount()
        .then((next) => !cancelled && setCount(next))
        .catch(() => undefined);
    };
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [memberId]);

  return count;
}
