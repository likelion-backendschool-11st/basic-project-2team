import { useMemo, useSyncExternalStore } from 'react';
import { getStoredUserJson, logout, subscribeAuth, type LoginUser } from '../api/authApi';

/** 로그인 상태. 로그인하지 않았으면 user 는 null 입니다. */
export function useAuth() {
  const json = useSyncExternalStore(subscribeAuth, getStoredUserJson);
  const user = useMemo<LoginUser | null>(() => {
    try {
      return json ? (JSON.parse(json) as LoginUser) : null;
    } catch {
      return null;
    }
  }, [json]);
  return { user, logout };
}
