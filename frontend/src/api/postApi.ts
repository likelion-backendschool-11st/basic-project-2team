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

/** PUT /api/posts/{postId} — 작성과 같은 본문을 통째로 다시 보냅니다(tags 는 보낸 것으로 교체). */
export const updatePost = (postId: string, body: CreatePostRequest & { readonly tags: readonly string[] }) =>
  request<{ readonly id: number }>('PUT', `/api/posts/${encodeURIComponent(postId)}`, body);

export const createPost = (body: CreatePostRequest) => request<{ readonly id: number }>('POST', '/api/posts', body);

/** PATCH /api/posts/{postId}/status — COMPLETED 는 마이페이지 「활동 완료」에서만 쓰고 되돌릴 수 없습니다. */
export const changePostStatus = (postId: number, status: 'OPEN' | 'CLOSED' | 'COMPLETED') =>
  request<{ readonly id: number; readonly status: string }>('PATCH', `/api/posts/${postId}/status`, { status });

const postUrl = (postId: string, tail = '') => `/api/posts/${encodeURIComponent(postId)}${tail}`;

export const deletePost = (postId: string) => request<void>('DELETE', postUrl(postId));
export const addScrap = (postId: string) => request<void>('POST', postUrl(postId, '/scrap'));
export const removeScrap = (postId: string) => request<void>('DELETE', postUrl(postId, '/scrap'));

/** 참가 신청 · 취소 (docs/API_SPEC.md 4절). role · message 는 선택이라 원클릭 신청은 빈 본문으로 보냅니다. */
export const applyToPost = (postId: string) => request<{ readonly id: number; readonly status: string }>('POST', postUrl(postId, '/applications'), {});
export const cancelApplication = (postId: string) => request<void>('DELETE', postUrl(postId, '/applications/me'));

/** GET /api/posts/{postId}/applications 아이템 */
export interface ApplicationResponse {
  readonly id: number;
  readonly status: string;
  readonly role: string | null;
  readonly message: string | null;
  readonly appliedAt: string;
  readonly applicant: { readonly id: number; readonly nickname: string; readonly level: number; readonly mannerTemp: number; readonly reviewCount: number };
}
export const getPendingApplications = (postId: string) => request<readonly ApplicationResponse[]>('GET', postUrl(postId, '/applications?status=PENDING'));
export const decideApplication = (postId: string, applicationId: number, status: 'ACCEPTED' | 'REJECTED') =>
  request<{ readonly id: number; readonly current: number; readonly max: number }>('PATCH', postUrl(postId, `/applications/${applicationId}`), { status });

/** GET /api/posts/{postId}/related 아이템 (목록 아이템과 같은 모양 중 화면에 쓰는 것만) */
export interface RelatedPostResponse {
  readonly id: number;
  readonly gameName: string;
  readonly title: string;
  readonly current: number;
  readonly max: number;
}
export const getRelatedPosts = (postId: string) => request<readonly RelatedPostResponse[]>('GET', postUrl(postId, '/related?limit=3'));
