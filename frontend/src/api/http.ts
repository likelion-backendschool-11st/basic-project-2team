/** API 서버 주소. 배포 환경에서는 VITE_API_BASE_URL 로 바꿉니다. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/** 로그인 API 연동 시 이 키로 accessToken 을 저장합니다. */
export const ACCESS_TOKEN_KEY = 'accessToken';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** `{ success: false, error }` 응답을 던질 때 쓰는 예외 (docs/API_SPEC.md 1절) */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: readonly FieldError[];

  constructor(status: number, code: string, message: string, fields: readonly FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
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

/** 로그인(accessToken 저장) 여부. 토큰이 만료됐는지는 API 응답(401)으로 알 수 있습니다. */
export const hasAccessToken = () => Boolean(readToken(ACCESS_TOKEN_KEY));

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: { readonly code: string; readonly message: string; readonly fields?: readonly FieldError[] };
}

export interface RequestOptions {
  /** Authorization 헤더에 실을 토큰의 localStorage 키 (관리자 API 는 ADMIN_ACCESS_TOKEN_KEY) */
  readonly tokenKey?: string;
}

/** JSON 요청을 보내고 `data` 를 돌려줍니다. 실패하면 ApiRequestError 를 던집니다. 204 응답이면 undefined 입니다. */
export async function request<T>(method: string, path: string, body?: unknown, { tokenKey = ACCESS_TOKEN_KEY }: RequestOptions = {}): Promise<T> {
  const token = readToken(tokenKey);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    const error = json?.error;
    throw new ApiRequestError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? '요청에 실패했습니다.', error?.fields);
  }
  return json.data as T;
}
