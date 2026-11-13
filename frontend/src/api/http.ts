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

const readToken = () => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: { readonly code: string; readonly message: string; readonly fields?: readonly FieldError[] };
}

/** JSON 요청을 보내고 `data` 를 돌려줍니다. 실패하면 ApiRequestError 를 던집니다. */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = readToken();
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
  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    const error = json?.error;
    throw new ApiRequestError(res.status, error?.code ?? 'UNKNOWN', error?.message ?? '요청에 실패했습니다.', error?.fields);
  }
  return json.data as T;
}
