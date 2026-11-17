import { useEffect, useRef } from 'react';
import { getParticipants } from '../api/postApi';
import type { Participant } from '../data/postData';

/** 화면을 보는 동안 확정 파티원 명단을 다시 확인하는 주기 (추방 안내 확인 주기와 같음) */
const CHECK_INTERVAL_MS = 5_000;

/** 명단 비교용 키: 파티장 → 수락 순으로 오는 회원 id 를 이은 값 */
const rosterKey = (members: readonly { readonly id?: number }[]) => members.map((m) => m.id).join(',');

interface ParticipantsWatchOptions {
  /** false 면 확인하지 않습니다 (공대장 · 승인된 파티원 화면에서만 켭니다) */
  readonly enabled: boolean;
  /** 서버의 명단이 화면과 달라졌을 때 (공고 상세 · 명단 · 투표를 다시 불러옴) */
  readonly onChange: () => void;
}

/**
 * 공고 실시간 신호(SSE)를 놓쳐도 확정 파티원 명단의 변화(초대 수락 · 승인 · 탈퇴 · 추방)를 알아채게 합니다.
 * 신호 구독 목록은 서버 프로세스 메모리에 있어서, 서버리스(Vercel)처럼 인스턴스가 여럿이면 다른 인스턴스가 처리한 변경
 * (예: 초대받은 회원의 수락)의 신호가 이 화면에 오지 않고, 연결은 살아 있어 usePostEvents 의 대체 폴링도 돌지 않습니다.
 * 그래서 화면을 보는 동안 5초마다 명단(GET /api/posts/{postId}/participants)만 받아 화면의 명단과 비교하고, 다르면 onChange 를 부릅니다.
 * 탭이 숨겨져 있으면 쉬고, 탭으로 돌아오거나 창에 포커스가 오면 바로 확인합니다.
 */
export function useParticipantsWatch(postId: string, participants: readonly Participant[], { enabled, onChange }: ParticipantsWatchOptions) {
  const latest = useRef({ key: rosterKey(participants), onChange });
  useEffect(() => {
    latest.current = { key: rosterKey(participants), onChange };
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let inFlight = false;
    const check = () => {
      if (inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      getParticipants(postId)
        .then((items) => {
          if (!cancelled && rosterKey(items) !== latest.current.key) latest.current.onChange();
        })
        .catch(() => undefined) // 일시적인 오류는 다음 확인에서 다시 봅니다.
        .finally(() => {
          inFlight = false;
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };

    // 첫 확인은 주기 뒤에 합니다(화면을 처음 불러오는 요청과 겹치지 않게).
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [postId, enabled]);
}
