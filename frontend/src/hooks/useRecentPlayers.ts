import { useEffect, useState } from 'react';
import { getRecentPlayers, toRecentPlayer } from '../api/mypageApi';
import { recentPlayersText, type RecentPlayer } from '../data/myPageData';

/** 최근 함께한 플레이어 (GET /api/members/me/recent-players, 최대 10명) */
export function useRecentPlayers() {
  const [players, setPlayers] = useState<readonly RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRecentPlayers()
      .then((items) => {
        if (!cancelled) setPlayers(items.map(toRecentPlayer));
      })
      // 401 은 프로필 요약(useMyProfile)이 로그인 화면으로 보냅니다.
      .catch(() => {
        if (!cancelled) setError(recentPlayersText.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { players, loading, error };
}
