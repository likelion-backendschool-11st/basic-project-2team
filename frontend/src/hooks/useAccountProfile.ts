import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../api/accountApi';
import { ApiRequestError } from '../api/http';
import { ROUTES } from '../data/routes';

export interface AccountProfile {
  readonly nickname: string;
  readonly userId: string;
  readonly avatarUrl: string | null;
  /** 아바타가 없을 때 보여줄 닉네임 첫 글자 */
  readonly initial: string;
}

/** 계정 관리 화면 좌측 프로필 (GET /api/members/me). 로그인이 풀렸으면 로그인 화면으로 보냅니다. */
export function useAccountProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setProfile({
          nickname: me.nickname,
          userId: me.userId,
          avatarUrl: me.avatarUrl,
          initial: Array.from(me.nickname)[0] ?? '',
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) navigate(ROUTES.login, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return profile;
}
