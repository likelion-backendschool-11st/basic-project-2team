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

export const createPost = (body: CreatePostRequest) => request<{ readonly id: number }>('POST', '/api/posts', body);
