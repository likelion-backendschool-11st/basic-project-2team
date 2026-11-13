import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { getMySummary, toProfileSummary } from '../api/mypageApi';
import { profileText, type ProfileSummary } from '../data/myPageData';
import { ROUTES } from '../data/routes';

/** 마이페이지 프로필 요약 (GET /api/members/me/summary). 로그인이 풀렸으면 로그인 화면으로 보냅니다. */
export function useMyProfile() {
  const navigate = useNavigate();
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
        if (err instanceof ApiRequestError && err.status === 401) {
          navigate(ROUTES.login, { replace: true });
          return;
        }
        setError(errorMessageOf(err, profileText.loadFailed));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { profile, error, reload };
}
