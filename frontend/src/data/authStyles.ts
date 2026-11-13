import type { LoginSanction } from '../api/authApi';

/** 정지 회원 안내 모달의 제재 종류별 색 (기간 정지: amber, 영구 정지: rose). Tailwind JIT 가 볼 수 있게 정적 문자열로 둡니다. */
export const sanctionNoticeStyles: Record<LoginSanction['type'], { readonly badge: string; readonly highlight: string; readonly panel: string }> = {
  SUSPEND: {
    badge: 'bg-amberAccent/15 text-amberAccent ring-1 ring-amberAccent/30',
    highlight: 'text-amberAccent',
    panel: 'border-amberAccent/20 bg-amberAccent/5',
  },
  BAN: {
    badge: 'bg-roseAccent/15 text-roseAccent ring-1 ring-roseAccent/30',
    highlight: 'text-roseAccent',
    panel: 'border-roseAccent/20 bg-roseAccent/5',
  },
};
