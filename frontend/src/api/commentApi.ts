import type { CommentChannel, CommentSort } from '../data/commentData';
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
  /** 채택된 답글이면 true (루트 댓글은 항상 false) */
  readonly accepted: boolean;
  /** 참가자 전용 댓글이면 true */
  readonly partyOnly: boolean;
  /** 참가자 전용 목록에서, 작성자가 지금 파티원이면 그 파티 정보 (일반 댓글·파티를 떠난 작성자는 null) */
  readonly partyMember: PartyMemberInfo | null;
  readonly createdAt: string;
}

export interface PartyMemberInfo {
  readonly isHost: boolean;
  /** 신청할 때 고른 포지션 (공대장은 null) */
  readonly role: string | null;
  readonly mannerTemp: number;
}

export interface RootCommentResponse extends CommentResponse {
  /** 이 댓글에 달린 채택 답글의 id (없으면 null). 채택 답글은 replies 맨 위에 옵니다. */
  readonly acceptedReplyId: number | null;
  readonly replies: readonly CommentResponse[];
}

export interface CommentPage {
  readonly items: readonly RootCommentResponse[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly channel: CommentChannel;
  /** 이 채널의 댓글 수 (답글 포함) */
  readonly commentCount: number;
}

export interface CommentListParams {
  readonly sort: CommentSort;
  readonly page: number;
  readonly size: number;
  readonly channel: CommentChannel;
}

/** channel=party 는 공대장 + 승인된 파티원만 (그 외 403 PARTY_ONLY) */
export function getComments(postId: string, { sort, page, size, channel }: CommentListParams) {
  const query = new URLSearchParams({ sort, page: String(page), size: String(size), channel });
  return request<CommentPage>('GET', `/api/posts/${encodeURIComponent(postId)}/comments?${query}`);
}

/** 답글은 부모 댓글의 채널을 따르므로 channel 은 루트 댓글에서만 의미가 있습니다. */
export const createComment = (postId: string, body: { readonly text: string; readonly parentId?: number; readonly secret: boolean; readonly channel: CommentChannel }) =>
  request<CommentResponse>('POST', `/api/posts/${encodeURIComponent(postId)}/comments`, body);

export const updateComment = (commentId: number, text: string) =>
  request<CommentResponse>('PATCH', `/api/comments/${commentId}`, { text });

export const deleteComment = (commentId: number) => request<void>('DELETE', `/api/comments/${commentId}`);

/** POST /api/reports — 댓글 신고 (docs/API_SPEC.md 6절). 공고 신고는 postApi.reportPost. */
export const reportComment = (commentId: number, reason: string, detail?: string) =>
  request<{ readonly id: number }>('POST', '/api/reports', { targetType: 'COMMENT', targetId: commentId, reason, ...(detail ? { detail } : {}) });

/** POST /api/reports — 회원(프로필 페이지) 신고. 사유 문구는 댓글 신고와 같습니다. */
export const reportMember = (memberId: number, reason: string, detail?: string) =>
  request<{ readonly id: number }>('POST', '/api/reports', { targetType: 'MEMBER', targetId: memberId, reason, ...(detail ? { detail } : {}) });

/** PUT /api/comments/{replyId}/accept — 그 답글이 달린 댓글의 작성자만. 이미 채택한 답글이 있으면 이 답글로 바뀝니다. */
export const acceptReply = (replyId: number) => request<{ readonly commentId: number; readonly acceptedReplyId: number }>('PUT', `/api/comments/${replyId}/accept`);

/** DELETE /api/comments/{replyId}/accept → 204 */
export const cancelReplyAcceptance = (replyId: number) => request<void>('DELETE', `/api/comments/${replyId}/accept`);
