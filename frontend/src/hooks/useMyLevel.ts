import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { updateStoredUser } from '../api/authApi';
import { getMyLevel, toExpGauge, type MyLevelResponse } from '../api/mypageApi';

/**
 * 헤더 간략 프로필의 레벨·경험치 게이지 (GET /api/members/me/level).
 * 글·댓글 작성 등으로 점수가 오르면 보통 화면을 옮기므로, 화면(pathname)이 바뀔 때마다 다시 불러옵니다.
 * 레벨이 바뀌었으면 저장된 로그인 정보도 맞춰 레벨 배지가 따라오게 합니다.
 * 불러오기 전이거나 실패하면 null 이라 게이지를 그리지 않습니다.
 */
export function useMyLevel(storedLevel: number) {
  const { pathname } = useLocation();
  const [level, setLevel] = useState<MyLevelResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyLevel()
      .then((res) => !cancelled && setLevel(res))
      .catch(() => {
        // 게이지는 부가 정보라 실패해도 헤더는 그대로 둡니다 (토큰 만료 등은 다른 요청이 처리).
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (level && level.level !== storedLevel) updateStoredUser({ level: level.level });
  }, [level, storedLevel]);

  return useMemo(() => (level ? toExpGauge(level.exp) : null), [level]);
}
