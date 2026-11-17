import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  NOTIFICATIONS_CHANGE_EVENT,
  notifyNotificationsChanged,
  UNREAD_COUNT_CHANGED_EVENT,
  type NotificationItem,
} from '../api/notificationApi';
import { getPostDetail } from '../api/postDetailApi';
import { KICK_REASON_MARKER, KICK_TITLE_PATTERN } from '../data/postData';
import { paths, ROUTES } from '../data/routes';
import { useAuth } from './useAuth';

/** 화면을 보고 있는 동안 안 읽은 추방 알림을 확인하는 주기 */
const POLL_INTERVAL_MS = 5_000;
/** 한 번에 가져올 안 읽은 추방 알림 수 (최신순) */
const CHECK_SIZE = 5;

/** 추방 안내 모달에 보여줄 내용 */
export interface KickedNoticeView {
  readonly notificationId: number;
  readonly postId: number | null;
  /** 대상 공고 제목 (공고가 삭제됐거나 못 불러오면 알림 문구에 적힌 제목) */
  readonly postTitle: string;
  /** 공대장 닉네임 (공고를 못 불러오면 null) */
  readonly hostName: string | null;
  /** 공대장이 남긴 추방 사유 (없으면 null) */
  readonly reason: string | null;
}

/** 「'제목' 파티에서 … 추방되었습니다.\n사유: …」 알림 문구 → 제목과 사유 (형식이 다르면 본문 전체를 제목 자리에) */
function parseKickMessage(message: string) {
  const at = message.indexOf(KICK_REASON_MARKER);
  const head = at < 0 ? message : message.slice(0, at);
  const reason = at < 0 ? null : message.slice(at + KICK_REASON_MARKER.length).trim() || null;
  return { title: KICK_TITLE_PATTERN.exec(head)?.[1] ?? head, reason };
}

/** 알림 + 공고 상세(제목 · 공대장) → 모달 내용. 공고가 삭제됐거나 못 불러오면 알림 문구만으로 채웁니다. */
async function toView(item: NotificationItem): Promise<KickedNoticeView> {
  const { title, reason } = parseKickMessage(item.message);
  const base = { notificationId: item.id, postId: item.postId, postTitle: title, hostName: null, reason };
  if (item.postId === null) return base;
  try {
    const post = await getPostDetail(String(item.postId), false);
    return { ...base, postTitle: post.title, hostName: post.host.nickname };
  } catch {
    return base;
  }
}

/**
 * 파티장에게 추방당하면(안 읽은 PARTY_KICKED 알림이 있으면) 어느 화면에 있든 추방 안내 모달을 띄웁니다.
 *
 * 「추방 순간의 신호」가 아니라 서버의 「안 읽은 추방 알림」을 기준으로 삼습니다. 그래서 추방 직후 페이지를 옮기거나
 * 새로고침해도, 다른 탭·기기에서 추방된 뒤 앱을 다시 열어도 모달이 뜨고, 확인을 눌러 읽음 처리할 때까지 다시 확인합니다.
 * - 로그인하면 바로, 화면을 보는 동안 5초마다, 탭으로 돌아오거나 창에 포커스가 올 때 확인합니다.
 * - 공고 상세가 실시간 신호로 추방을 알아채면(NOTIFICATIONS_CHANGE_EVENT) 기다리지 않고 바로 확인합니다.
 * - 확인을 누르면 추방 알림을 읽음 처리하고, 추방된 그 공고 화면에 있었으면 이전 페이지로 이동합니다.
 */
export function useKickedNotice() {
  const { user } = useAuth();
  const memberId = user?.id ?? null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notice, setNotice] = useState<KickedNoticeView | null>(null);
  /** 마지막 확인에서 찾은 안 읽은 추방 알림 id (확인을 누르면 모두 읽음 처리) */
  const unreadIds = useRef<readonly number[]>([]);
  /** 확인을 눌러 읽음 요청을 보낸 알림. 읽음이 반영되기 전에 다음 확인이 같은 알림을 다시 띄우지 않게 합니다. */
  const dismissed = useRef(new Set<number>());

  useEffect(() => {
    setNotice(null);
    unreadIds.current = [];
    dismissed.current = new Set();
    if (memberId === null) return;
    let cancelled = false;
    let inFlight = false;
    let queued = false;

    const check = () => {
      if (document.visibilityState === 'hidden') return; // 돌아오면(visibilitychange) 바로 확인합니다
      if (inFlight) {
        queued = true; // 진행 중인 확인이 끝나면 한 번 더 확인합니다(그 사이 들어온 추방을 놓치지 않게)
        return;
      }
      inFlight = true;
      getNotifications(1, CHECK_SIZE, true, 'PARTY_KICKED')
        .then(async (res) => {
          if (cancelled) return;
          const fresh = res.items.filter((item) => !dismissed.current.has(item.id));
          unreadIds.current = fresh.map((item) => item.id);
          if (fresh.length === 0) return;
          const view = await toView(fresh[0]);
          if (!cancelled) setNotice((prev) => prev ?? view);
        })
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
          if (queued && !cancelled) {
            queued = false;
            check();
          }
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    const timer = window.setInterval(check, POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, check);
    window.addEventListener(UNREAD_COUNT_CHANGED_EVENT, check);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, check);
      window.removeEventListener(UNREAD_COUNT_CHANGED_EVENT, check);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [memberId]);

  /** 추방된 그 공고 화면을 보고 있는지 (확인하면 이전 페이지로 이동) */
  const onKickedPost = notice !== null && notice.postId !== null && pathname === paths.postDetail(String(notice.postId));

  /** 모달을 닫고 찾아 둔 추방 알림을 모두 읽음 처리합니다(헤더 배지도 다시 셉니다). */
  const dismiss = useCallback(() => {
    if (!notice) return;
    const ids = unreadIds.current.includes(notice.notificationId) ? unreadIds.current : [...unreadIds.current, notice.notificationId];
    ids.forEach((id) => dismissed.current.add(id));
    setNotice(null);
    void Promise.all(ids.map((id) => markNotificationRead(String(id))))
      .then(notifyNotificationsChanged)
      .catch(() => undefined);
  }, [notice]);

  /** 확인: 추방된 공고 화면이면 이전 페이지로(앱 밖에서 바로 열었으면 게시판으로), 다른 화면이면 창만 닫습니다. */
  const confirm = useCallback(() => {
    if (!notice) return;
    dismiss();
    if (!onKickedPost) return;
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(ROUTES.board, { replace: true });
  }, [notice, dismiss, onKickedPost, navigate]);

  /** 이의 신청 링크: 알림을 읽음 처리하고 고객지원 페이지로 갑니다. */
  const toSupport = useCallback(() => {
    if (!notice) return;
    dismiss();
    navigate(ROUTES.support);
  }, [notice, dismiss, navigate]);

  return { notice, onKickedPost, confirm, toSupport };
}
