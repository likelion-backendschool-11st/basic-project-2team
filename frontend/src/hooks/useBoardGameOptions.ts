import { useEffect, useState } from 'react';
import { getGames, type Game } from '../api/gameApi';

/** 게임 필터 선택지. categoryCode 를 주면 그 카테고리의 게임만 남깁니다 (전체면 생략). 실패하면 빈 목록(전체만 선택 가능). */
export function useBoardGameOptions(categoryCode?: string) {
  const [games, setGames] = useState<readonly Game[]>([]);

  useEffect(() => {
    let cancelled = false;
    getGames()
      .then((list) => !cancelled && setGames(list))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return categoryCode ? games.filter((g) => g.categoryCode === categoryCode) : games;
}
