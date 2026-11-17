import { useCallback, useRef, useState } from 'react';
import { useDismiss } from './useDismiss';

/**
 * 파티 참가자 명단에서 누른 참가자의 메뉴 창(프로필 보기 · 추방)을 하나만 열어 둡니다.
 * 같은 참가자를 다시 누르거나, 창 바깥을 누르거나, Esc 를 누르면 닫힙니다.
 */
export function useParticipantMenu() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setOpenKey(null), []);
  const toggle = useCallback((key: string) => setOpenKey((prev) => (prev === key ? null : key)), []);
  useDismiss(listRef, openKey !== null, close);
  return { openKey, toggle, close, listRef };
}
