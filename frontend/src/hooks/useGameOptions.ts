import { useEffect, useState } from 'react';
import { getGames } from '../api/gameApi';
import type { SelectOption } from '../data/adminData';

/** 게임 필터 옵션 (value = game code). 불러오지 못하면 빈 목록이라 "전체" 만 보입니다. */
export function useGameOptions() {
  const [options, setOptions] = useState<readonly SelectOption[]>([]);
  useEffect(() => {
    let ignore = false;
    getGames()
      .then((games) => {
        if (!ignore) setOptions(games.map((g) => ({ value: g.code, label: g.name })));
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);
  return options;
}
