import { request } from './http';

/* ── 내 계정 관리 (docs/API_SPEC.md 2절) ── */

/** GET /api/members/me */
export interface MeResponse {
  readonly id: number;
  readonly userId: string;
  readonly nickname: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly name: string | null;
  readonly bio: string | null;
  readonly ageRange: string | null;
  readonly ageRangePublic: boolean;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly games: readonly {
    readonly code: string;
    readonly name: string;
    readonly isMain: boolean;
    readonly playStyle: string | null;
  }[];
  readonly createdAt: string;
}

export const getMe = () => request<MeResponse>('GET', '/api/members/me');

/** PATCH /api/members/me 본문 — 보낸 항목만 바뀝니다. mainGame·playStyle 은 games 와 함께 보냅니다. */
export interface ProfileUpdateRequest {
  readonly nickname?: string;
  /** 200자 이하, null 이면 지움 */
  readonly bio?: string | null;
  /** 10자 이하, null 이면 지움 */
  readonly ageRange?: string | null;
  readonly ageRangePublic?: boolean;
  readonly games?: readonly string[];
  readonly mainGame?: string | null;
  readonly playStyle?: string | null;
}

/** 다른 회원이 쓰는 닉네임이면 409 DUPLICATE_NICKNAME. 바뀐 내 정보를 돌려줍니다. */
export const updateProfile = (body: ProfileUpdateRequest) => request<MeResponse>('PATCH', '/api/members/me', body);

/**
 * DELETE /api/members/me → 204. 비밀번호가 틀리면 400 INVALID_PASSWORD,
 * 진행 중인 파티가 있으면 409 ACTIVE_PARTY_EXISTS.
 */
export const withdraw = (password: string, reason: string | null) =>
  request<void>('DELETE', '/api/members/me', reason ? { password, reason } : { password });

/**
 * PUT /api/members/me/avatar — 이미지 파일 바이트를 그대로 보냅니다 (PNG·JPG·GIF·WEBP, 2MB 이하).
 * 이미지가 아니면 400 INVALID_IMAGE, 너무 크면 413. 돌려받은 avatarUrl 은 서버 경로라 화면에서는 assetUrl 로 바꿔 씁니다.
 */
export const uploadAvatar = (file: File) => request<{ readonly avatarUrl: string }>('PUT', '/api/members/me/avatar', file);

/** DELETE /api/members/me/avatar → 204. 기본 이미지로 되돌립니다. */
export const deleteAvatar = () => request<void>('DELETE', '/api/members/me/avatar');

/**
 * PATCH /api/members/me/password → 204.
 * 현재 비밀번호가 틀리면 400 INVALID_PASSWORD, 새 비밀번호가 지금과 같으면 400 SAME_PASSWORD.
 * 성공하면 서버가 모든 Refresh Token 을 폐기하므로 다시 로그인해야 합니다.
 */
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<void>('PATCH', '/api/members/me/password', { currentPassword, newPassword });
