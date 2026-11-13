import { reviewText, type ReviewMember, type ReviewTag } from '../data/reviewData';
import { request } from './http';

/** GET /api/review-tags 아이템 (docs/API_SPEC.md 7절) */
export interface ReviewTagResponse {
  readonly code: string;
  readonly label: string;
}

/** GET /api/posts/{postId}/reviews/targets 아이템 */
export interface ReviewTargetResponse {
  readonly id: number;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly game: string;
  readonly characterName: string | null;
  readonly role: string | null;
  readonly isHost: boolean;
  readonly reviewed: boolean;
}

/** POST /api/posts/{postId}/reviews 의 reviews[] 아이템 */
export interface ReviewRequestItem {
  readonly targetMemberId: number;
  readonly rating: number;
  readonly tags: readonly string[];
  readonly comment: string;
}

export const getReviewTags = () => request<readonly ReviewTagResponse[]>('GET', '/api/review-tags');

export const getReviewTargets = (postId: number) => request<readonly ReviewTargetResponse[]>('GET', `/api/posts/${postId}/reviews/targets`);

export const submitReviews = (postId: number, reviews: readonly ReviewRequestItem[]) =>
  request<{ readonly reviewIds: readonly number[] }>('POST', `/api/posts/${postId}/reviews`, { reviews });

export const toReviewTag = (tag: ReviewTagResponse): ReviewTag => ({ id: tag.code, label: tag.label });

export const toReviewMember = (target: ReviewTargetResponse): ReviewMember => ({
  id: String(target.id),
  name: target.nickname,
  level: target.level,
  game: target.game,
  className: target.characterName ?? '',
  role: target.isHost ? reviewText.hostRole : (target.role ?? reviewText.memberRole),
});
