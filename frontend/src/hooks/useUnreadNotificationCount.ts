import { useEffect, useState } from 'react';
import { openAuthorizedStream } from '../api/http';
import { getUnreadCount, NOTIFICATIONS_CHANGE_EVENT, UNREAD_COUNT_CHANGED_EVENT } from '../api/notificationApi';
import { useAuth } from './useAuth';

const POLL_INTERVAL_MS = 10_000;
/** 실시간 연결이 끊겼을 때 다시 붙는 간격: 3초에서 시작해 실패할 때마다 두 배, 최대 1분 */
const RETRY_MIN_MS = 3_000;
const RETRY_MAX_MS = 60_000;

/**
 * 내 알림 변경 신호(SSE, GET /api/notifications/stream)를 받는 동안 onSignal 을 부릅니다. 연결되면 onSignal 을 한 번 불러 놓친 변경을 맞춥니다.
 * 끊기면 점점 늘어나는 간격으로 다시 연결하고, signal 이 abort 되면 멈춥니다.
 */
function listenNotificationStream(onSignal: () => void, signal: AbortSignal) {
  let delay = RETRY_MIN_MS;
  let retry: number | undefined;
  const connect = async () => {
    try {
      const res = await openAuthorizedStream('/api/notifications/stream', signal);
      if (res?.ok && res.body) {
        delay = RETRY_MIN_MS;
        onSignal();
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          if (events.some((e) => /^event: notifications$/m.test(e))) onSignal();
        }
      }
    } catch {
      // 네트워크 끊김·abort — 아래에서 다시 연결하거나 멈춥니다.
    }
    if (signal.aborted) return;
    retry = window.setTimeout(() => void connect(), delay);
    delay = Math.min(delay * 2, RETRY_MAX_MS);
  };
  void connect();
  signal.addEventListener('abort', () => window.clearTimeout(retry));
}

/**
 * 헤더 알림 배지용 안 읽은 알림 수. 로그인했을 때만 조회하고, 서버가 실시간 신호(파티 초대 등)를 보낼 때 바로,
 * 그리고 10초마다·탭으로 돌아왔을 때·알림을 읽거나 지웠을 때 다시 가져옵니다(실시간 신호가 없는 알림은 폴링으로 반영).
 * 처음 조회 뒤에 숫자가 달라지면 UNREAD_COUNT_CHANGED_EVENT 를 보내 알림 목록이 따라 갱신되게 합니다.
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
    let last: number | null = null;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      getUnreadCount()
        .then((next) => {
          if (cancelled) return;
          setCount(next);
          if (last !== null && next !== last) window.dispatchEvent(new Event(UNREAD_COUNT_CHANGED_EVENT));
          last = next;
        })
        .catch(() => undefined);
    };
    refresh();
    const stream = new AbortController();
    listenNotificationStream(refresh, stream.signal);
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      stream.abort();
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [memberId]);

  return count;
}
