import { request } from './http';

/** POST /api/posts 요청 본문 (docs/API_SPEC.md 3절) */
export interface CreatePostRequest {
  readonly title: string;
  readonly body: string;
  readonly partyName: string;
  readonly game: string;
  readonly type: string;
  readonly detail: string;
  readonly headcount: number;
  readonly style: string;
  readonly schedule?: string;
  readonly scheduleTbd: boolean;
  readonly voiceRequired: boolean;
}

/** 임시저장 응답 (docs/API_SPEC.md 3절). draft 는 작성 폼 값 중 저장된 필드만 담습니다. */
export interface DraftResponse {
  readonly draft: Readonly<Record<string, unknown>>;
  readonly savedAt: string;
}

export const saveDraft = (draft: object) => request<DraftResponse>('POST', '/api/posts/drafts', draft);

/** 내 임시저장. 저장한 적이 없으면 null */
export const getLatestDraft = () => request<DraftResponse | null>('GET', '/api/posts/drafts/latest');

export const createPost = (body: CreatePostRequest) => request<{ readonly id: number }>('POST', '/api/posts', body);
