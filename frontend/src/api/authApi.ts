import { ACCESS_TOKEN_KEY, request } from './http';

/** POST /api/auth/login 응답의 user (docs/API_SPEC.md 2절) */
export interface LoginUser {
  readonly id: number;
  readonly nickname: string;
  readonly level: number;
  readonly mannerTemp: number;
  readonly avatarUrl: string | null;
  readonly online: boolean;
}

interface LoginResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: LoginUser;
}

const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';
const AUTH_CHANGE_EVENT = 'auth-change';

const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // 저장소를 쓸 수 없으면(시크릿 모드 등) 이 탭에서만 로그인이 유지되지 않습니다.
    }
  },
};

/** 현재 로그인한 회원. 헤더 등이 useSyncExternalStore 로 구독합니다 (같은 문자열이면 같은 스냅샷). */
export const getStoredUserJson = () => (storage.get(ACCESS_TOKEN_KEY) ? storage.get(USER_KEY) : null);

export const subscribeAuth = (onChange: () => void) => {
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange); // 다른 탭의 로그인/로그아웃
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

const saveSession = (accessToken: string | null, refreshToken: string | null, user: LoginUser | null) => {
  storage.set(ACCESS_TOKEN_KEY, accessToken);
  storage.set(REFRESH_TOKEN_KEY, refreshToken);
  storage.set(USER_KEY, user && JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export async function login(userId: string, password: string, rememberMe: boolean) {
  const result = await request<LoginResult>('POST', '/api/auth/login', { userId, password, rememberMe });
  saveSession(result.accessToken, result.refreshToken, result.user);
  return result.user;
}

/** 서버 로그아웃은 실패해도(토큰 만료 등) 이 브라우저의 로그인 정보는 지웁니다. */
export async function logout() {
  try {
    await request<void>('POST', '/api/auth/logout');
  } catch {
    // ignore
  } finally {
    saveSession(null, null, null);
  }
}

/* ------------------------------------------------------------------ */
/* 회원가입 · 아이디/비밀번호 찾기 (docs/API_SPEC.md 2절)               */
/* ------------------------------------------------------------------ */

export type AvailabilityType = 'userId' | 'nickname' | 'email';

/** GET /api/auth/check — 형식이 틀린 값이면 400 INVALID_INPUT (fields[0].message 에 이유) */
export const checkAvailability = (type: AvailabilityType, value: string) =>
  request<{ readonly available: boolean }>('GET', `/api/auth/check?${new URLSearchParams({ type, value })}`);

export interface SignupRequest {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly userId: string;
  readonly nickname: string;
  readonly password: string;
  readonly email: string;
  readonly agreements: { readonly terms: boolean; readonly privacy: boolean; readonly marketing: boolean };
}

export interface SignupResult {
  readonly id: number;
  readonly userId: string;
  readonly nickname: string;
}

export const signup = (body: SignupRequest) => request<SignupResult>('POST', '/api/auth/signup', body);

export const findId = (nickname: string, email: string) =>
  request<{ readonly userId: string }>('POST', '/api/auth/find-id', { nickname, email });

/** 아이디·이메일 일치 확인 → 재설정 토큰(15분) 발급 → 새 비밀번호로 재설정. 성공하면 다른 기기 로그인도 끊깁니다. */
export async function findAndResetPassword(userId: string, email: string, newPassword: string) {
  const { resetToken } = await request<{ readonly resetToken: string; readonly expiresAt: string }>(
    'POST',
    '/api/auth/find-password',
    { userId, email },
  );
  await request<void>('POST', '/api/auth/reset-password', { resetToken, newPassword });
}
