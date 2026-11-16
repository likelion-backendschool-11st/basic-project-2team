import { request } from './http';

/** OPEN: 투표 중 · ENDED: 마감 시각이 지났지만 미확정 · CONFIRMED: 공대장이 결과를 확정함 */
export type PollStatus = 'OPEN' | 'ENDED' | 'CONFIRMED';

export interface PollOption {
  readonly id: number;
  readonly label: string;
  readonly voteCount: number;
}

export interface PollPerson {
  readonly memberId: number;
  readonly nickname: string;
  readonly mannerTemp: number;
  readonly isHost: boolean;
}

export interface PollVoter extends PollPerson {
  readonly optionIds: readonly number[];
  readonly votedAt: string;
}

/** 투표 응답 (docs/API_SPEC.md 5절 「파티 의견 조율 투표」) */
export interface PollResponse {
  readonly id: number;
  readonly postId: number;
  readonly title: string;
  readonly description: string | null;
  readonly multiple: boolean;
  readonly commentersOnly: boolean;
  readonly pinned: boolean;
  readonly status: PollStatus;
  readonly closesAt: string;
  readonly createdAt: string;
  readonly confirmedAt: string | null;
  readonly finalOptionId: number | null;
  readonly notice: string | null;
  readonly options: readonly PollOption[];
  /** 투표한 사람 수 (복수 선택이어도 한 사람은 1) */
  readonly totalVoters: number;
  /** 투표할 수 있는 공대원 수 */
  readonly eligibleCount: number;
  readonly headcount: number;
  readonly currentCount: number;
  /** 비로그인이면 null */
  readonly viewer: {
    readonly memberId: number;
    readonly isHost: boolean;
    readonly isMember: boolean;
    readonly canVote: boolean;
    readonly votedOptionIds: readonly number[];
  } | null;
  /** 공대원(파티장 포함)에게만 내려옵니다. */
  readonly participants: { readonly voters: readonly PollVoter[]; readonly nonVoters: readonly PollPerson[] } | null;
}

/** 투표 생성·편집 요청 본문 */
export interface PollInput {
  readonly title: string;
  readonly description?: string;
  readonly multiple: boolean;
  readonly commentersOnly: boolean;
  readonly pinned: boolean;
  readonly closesAt: string;
  readonly options: readonly string[];
}

/** 결과 확정 요청 본문 */
export interface PollCloseInput {
  readonly finalOptionId: number;
  readonly notice?: string;
  readonly pinned: boolean;
  readonly postComment: boolean;
  readonly notifyMembers: boolean;
}

const postPath = (postId: string) => `/api/posts/${encodeURIComponent(postId)}/poll`;

/** 공고의 가장 최근 투표 (없으면 null) */
export const getPoll = (postId: string) => request<PollResponse | null>('GET', postPath(postId));
export const createPoll = (postId: string, body: PollInput) => request<PollResponse>('POST', postPath(postId), body);
export const updatePoll = (pollId: number, body: PollInput) => request<PollResponse>('PATCH', `/api/polls/${pollId}`, body);
/** 내 투표를 optionIds 로 바꿉니다. 빈 배열이면 취소 */
export const votePoll = (pollId: number, optionIds: readonly number[]) =>
  request<PollResponse>('PUT', `/api/polls/${pollId}/votes`, { optionIds });
export const pinPoll = (pollId: number, pinned: boolean) => request<PollResponse>('PATCH', `/api/polls/${pollId}/pin`, { pinned });
export const closePoll = (pollId: number, body: PollCloseInput) => request<PollResponse>('POST', `/api/polls/${pollId}/close`, body);
export const remindPoll = (pollId: number) => request<{ readonly count: number }>('POST', `/api/polls/${pollId}/reminders`);

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → `오후 10:00` (브라우저 시간대 기준) */
export function formatClock(date: Date) {
  const hours = date.getHours();
  return `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}:${pad(date.getMinutes())}`;
}

/** Date → datetime-local 입력값 `2026-11-16T22:00` */
export function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 득표율(%) — 투표한 사람 수 기준, 소수점 첫째 자리 */
export const votePercent = (count: number, total: number) => (total === 0 ? 0 : Math.round((count / total) * 1000) / 10);
