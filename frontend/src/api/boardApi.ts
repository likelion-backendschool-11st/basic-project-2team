import { boardText, gameTones, type BoardPost, type BoardCategoryId, type MembersTone, type PostBadge, type SortKey } from '../data/boardData';
import { request } from './http';

/** GET /api/posts 의 아이템 (docs/API_SPEC.md 3절 「공고 목록 아이템」) */
export interface PostListItem {
  readonly id: number;
  readonly category: Exclude<BoardCategoryId, 'all'>;
  readonly game: string;
  readonly gameName: string;
  readonly type: string;
  readonly title: string;
  readonly current: number;
  readonly max: number;
  readonly tags: readonly string[];
  readonly author: string;
  readonly schedule: string | null;
  readonly scheduleTbd: boolean;
  readonly voiceRequired: boolean;
  readonly views: number;
  readonly commentCount: number;
  readonly status: 'OPEN' | 'CLOSED' | 'COMPLETED';
  readonly createdAt: string;
}

export interface PostPage {
  readonly items: readonly PostListItem[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface PostListParams {
  /** 생략하면 전체 카테고리 */
  readonly category?: Exclude<BoardCategoryId, 'all'>;
  readonly q: string;
  readonly sort: SortKey;
  readonly tags: readonly string[];
  readonly page: number;
  readonly size: number;
  readonly excludeClosed: boolean;
}

export interface CategorySummary {
  readonly code: string;
  readonly name: string;
  readonly postCount: number;
}

export function getPosts(params: PostListParams) {
  const query = new URLSearchParams({
    sort: params.sort,
    page: String(params.page),
    size: String(params.size),
    excludeClosed: String(params.excludeClosed),
  });
  if (params.category) query.set('category', params.category);
  if (params.q.trim()) query.set('q', params.q.trim());
  if (params.tags.length > 0) query.set('tags', params.tags.join(','));
  return request<PostPage>('GET', `/api/posts?${query}`);
}

export const getCategories = () => request<readonly CategorySummary[]>('GET', '/api/categories');

/** 남은 자리가 적을수록 눈에 띄는 색 (1자리 이하 urgent, 2자리 few) */
const membersToneOf = (remaining: number): MembersTone => (remaining <= 1 ? 'urgent' : remaining <= 2 ? 'few' : 'open');

function badgeOf(item: PostListItem, remaining: number): PostBadge | undefined {
  if (item.status === 'CLOSED') return { label: boardText.badgeClosed, tone: 'neutral' };
  if (item.status === 'COMPLETED') return { label: boardText.badgeCompleted, tone: 'neutral' };
  if (remaining <= 1) return { label: boardText.badgeUrgent, tone: 'urgent' };
  if (item.voiceRequired) return { label: boardText.badgeVoice, tone: 'neutral', icon: 'fa-solid fa-microphone' };
  return undefined;
}

/** createdAt(ISO) → 목록에 보여줄 `MM-DD` (브라우저 시간대 기준) */
const toShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** API 아이템 → 게시판 화면용 BoardPost. order 는 서버가 정한 순서(목록 안의 위치)입니다. */
export function toBoardPost(item: PostListItem, order: number): BoardPost {
  const remaining = item.max - item.current;
  const closed = item.status !== 'OPEN';
  return {
    id: String(item.id),
    category: item.category,
    game: item.gameName,
    gameTone: gameTones[item.game] ?? 'indigo',
    title: item.title,
    current: item.current,
    max: item.max,
    membersTone: closed ? 'urgent' : membersToneOf(remaining),
    badge: badgeOf(item, remaining),
    tags: item.tags,
    author: item.author,
    date: toShortDate(item.createdAt),
    views: item.views,
    order,
  };
}
