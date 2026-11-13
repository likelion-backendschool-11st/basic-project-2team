import { request } from './http';

/** GET /api/members/{memberId} 응답 중 댓글 프로필 팝오버에서 쓰는 필드 (docs/API_SPEC.md 8절) */
export interface MemberProfileResponse {
  readonly id: number;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly reviewCount: number;
  readonly games: readonly { readonly code: string; readonly name: string; readonly isMain: boolean }[];
}

export const getMemberProfile = (memberId: number) => request<MemberProfileResponse>('GET', `/api/members/${memberId}`);
