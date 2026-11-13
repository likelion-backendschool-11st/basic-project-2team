import { useEffect, useState } from 'react';
import { getMannerRanking, toMannerLeaders, toMannerMembers } from '../api/rankingApi';
import { homeText, type MannerLeader, type MannerMember } from '../data/homeData';

/** 메인 「매너 온도 랭킹」 1~3위와 4~6위 (GET /api/rankings/manner, 한 번에 불러옵니다). */
export function useMannerRanking() {
  const [leaders, setLeaders] = useState<readonly MannerLeader[]>([]);
  const [members, setMembers] = useState<readonly MannerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMannerRanking(homeText.leaderLimit + homeText.memberLimit)
      .then((items) => {
        if (cancelled) return;
        setLeaders(toMannerLeaders(items));
        setMembers(toMannerMembers(items));
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
  return { leaders, members, notice };
}
