import { useEffect, useState } from 'react';
import { getMannerRanking, toMannerLeaders } from '../api/rankingApi';
import { homeText, type MannerLeader } from '../data/homeData';

/** 메인 「매너 온도 랭킹」 상위 3명 (GET /api/rankings/manner). */
export function useMannerRanking() {
  const [leaders, setLeaders] = useState<readonly MannerLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMannerRanking(homeText.leaderLimit)
      .then((items) => {
        if (!cancelled) setLeaders(toMannerLeaders(items));
      })
      .catch(() => {
        if (!cancelled) setError(homeText.leaderLoadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 비어 있을 때 보여줄 안내 (불러오는 중이면 null) */
  const notice = loading || leaders.length > 0 ? null : (error ?? homeText.leaderEmpty);
  return { leaders, notice };
}
