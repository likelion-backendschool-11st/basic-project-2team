import type { CommentSort } from '../data/commentData';
import { request } from './http';

/** 댓글 아이템 (docs/API_SPEC.md 5절 「댓글 목록」) */
export interface CommentResponse {
  readonly id: number;
  readonly parentId: number | null;
  readonly author: { readonly id: number; readonly nickname: string; readonly avatarUrl: string | null };
  readonly isPostAuthor: boolean;
  readonly mine: boolean;
  /** 볼 수 없는 비밀 댓글이면 null */
  readonly text: string | null;
  readonly secret: boolean;
  readonly hidden: boolean;
  readonly reported: boolean;
  readonly createdAt: string;
}

export interface RootCommentResponse extends CommentResponse {
  readonly replies: readonly CommentResponse[];
}

export interface CommentPage {
  readonly items: readonly RootCommentResponse[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface CommentListParams {
  readonly sort: CommentSort;
  readonly page: number;
  readonly size: number;
}

export function getComments(postId: string, { sort, page, size }: CommentListParams) {
  const query = new URLSearchParams({ sort, page: String(page), size: String(size) });
  return request<CommentPage>('GET', `/api/posts/${encodeURIComponent(postId)}/comments?${query}`);
}

export const createComment = (postId: string, body: { readonly text: string; readonly parentId?: number; readonly secret: boolean }) =>
  request<CommentResponse>('POST', `/api/posts/${encodeURIComponent(postId)}/comments`, body);

export const updateComment = (commentId: number, text: string) =>
  request<CommentResponse>('PATCH', `/api/comments/${commentId}`, { text });

export const deleteComment = (commentId: number) => request<void>('DELETE', `/api/comments/${commentId}`);

/** POST /api/reports — 현재 서버는 COMMENT 신고만 받습니다 (docs/API_SPEC.md 6절). */
export const reportComment = (commentId: number, reason: string, detail?: string) =>
  request<{ readonly id: number }>('POST', '/api/reports', { targetType: 'COMMENT', targetId: commentId, reason, ...(detail ? { detail } : {}) });
