/** API 서버 주소. 배포 환경에서는 VITE_API_BASE_URL 로 바꿉니다. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/** 회원 로그인 정보를 저장하는 localStorage 키와, 로그인 상태가 바뀌었을 때 보내는 이벤트 이름 */
export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'authUser';
export const AUTH_CHANGE_EVENT = 'auth-change';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** `{ success: false, error }` 응답을 던질 때 쓰는 예외 (docs/API_SPEC.md 1절) */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: readonly FieldError[];
  /** error 객체에 code·message·fields 외에 함께 온 값 (예: 정지 회원 로그인의 `sanction`). 도메인 api 파일에서 좁혀 씁니다. */
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: readonly FieldError[] = [],
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

/** 화면에 보여줄 에러 문구. 입력 오류(INVALID_INPUT)면 첫 번째 필드 메시지가 더 구체적이라 그것을 씁니다. */
export const errorMessageOf = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? (err.fields[0]?.message ?? err.message) : fallback;

const readToken = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeToken = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없으면(시크릿 모드 등) 이 탭에서만 로그인이 유지되지 않습니다.
  }
};

/** 로그인(accessToken 저장) 여부. 토큰이 만료됐는지는 API 응답(401)으로 알 수 있습니다. */
export const hasAccessToken = () => Boolean(readToken(ACCESS_TOKEN_KEY));

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly fields?: readonly FieldError[];
    readonly [key: string]: unknown;
  };
}

export interface RequestOptions {
  /** Authorization 헤더에 실을 토큰의 localStorage 키 (관리자 API 는 ADMIN_ACCESS_TOKEN_KEY) */
  readonly tokenKey?: string;
}

const send = async (method: string, path: string, body: unknown, token: string | null) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
};

const readEnvelope = async <T,>(res: Response) =>
  res.status === 204 ? null : ((await res.json().catch(() => null)) as ApiEnvelope<T> | null);

/**
 * Refresh Token 으로 Access Token 을 재발급합니다 (POST /api/auth/refresh). 성공하면 true.
 * Refresh Token 도 새로 발급(rotation)되므로 둘 다 저장합니다.
 * 재발급이 거절되면(Refresh Token 만료·폐기) 로그인 정보를 지우고, 네트워크 오류면 그대로 둡니다.
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = readToken(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  let res: Response;
  try {
    res = await send('POST', '/api/auth/refresh', { refreshToken }, null);
  } catch {
    return false;
  }
  const json = await readEnvelope<{ readonly accessToken: string; readonly refreshToken: string }>(res);
  if (res.ok && json?.success && json.data) {
    writeToken(ACCESS_TOKEN_KEY, json.data.accessToken);
    writeToken(REFRESH_TOKEN_KEY, json.data.refreshToken);
    return true;
  }
  // 다른 탭이 같은 Refresh Token 으로 먼저 재발급했다면 그 탭이 저장한 새 토큰을 씁니다.
  if (readToken(REFRESH_TOKEN_KEY) !== refreshToken) return true;
  if (res.status >= 400 && res.status < 500) {
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY].forEach((key) => writeToken(key, null));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
  return false;
}

/** 여러 요청이 동시에 만료되어도 재발급 요청은 한 번만 보냅니다. */
let refreshInFlight: Promise<boolean> | null = null;
const refreshOnce = () => (refreshInFlight ??= refreshAccessToken().finally(() => (refreshInFlight = null)));

/**
 * JSON 요청을 보내고 `data` 를 돌려줍니다. 실패하면 ApiRequestError 를 던집니다. 204 응답이면 undefined 입니다.
 * 회원 Access Token 이 만료(401 TOKEN_EXPIRED)되면 Refresh Token 으로 재발급받아 원래 요청을 한 번 다시 보냅니다.
 */
export async function request<T>(method: string, path: string, body?: unknown, { tokenKey = ACCESS_TOKEN_KEY }: RequestOptions = {}): Promise<T> {
  const token = readToken(tokenKey);
  let res = await send(method, path, body, token);
  let json = await readEnvelope<T>(res);

  const expired = res.status === 401 && json?.error?.code === 'TOKEN_EXPIRED';
  if (expired && tokenKey === ACCESS_TOKEN_KEY && token && (await refreshOnce())) {
    res = await send(method, path, body, readToken(ACCESS_TOKEN_KEY));
    json = await readEnvelope<T>(res);
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok || !json?.success) {
    const { code = 'UNKNOWN', message = '요청에 실패했습니다.', fields, ...details } = json?.error ?? {};
    throw new ApiRequestError(res.status, code, message, fields, details);
  }
  return json.data as T;
}
