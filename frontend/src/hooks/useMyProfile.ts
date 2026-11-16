import { useCallback, useEffect, useState } from 'react';
import { errorMessageOf } from '../api/http';
import { getMySummary, toProfileSummary } from '../api/mypageApi';
import { profileText, type ProfileSummary } from '../data/myPageData';

/** 마이페이지 프로필 요약 (GET /api/members/me/summary). 로그인이 풀렸으면 로그인 안내 모달이 뜹니다(api/http.ts). */
export function useMyProfile() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMySummary()
      .then((res) => {
        if (cancelled) return;
        setProfile(toProfileSummary(res));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessageOf(err, profileText.loadFailed));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { profile, error, reload };
}
