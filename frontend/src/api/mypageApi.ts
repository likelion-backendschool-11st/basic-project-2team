import {
  activityText,
  favoritesText,
  gameAccents,
  profileText,
  type ActivityAction,
  type ActivityComment,
  type ActivityPost,
  type FavoriteUser,
  type ProfileSummary,
  type TopTag,
} from '../data/myPageData';
import type { ApplicationStatus, PostStatus } from '../data/postData';
import { paths } from '../data/routes';
import { styleChoices } from '../data/writeData';
import { request } from './http';

/* ── 응답 타입 (docs/API_SPEC.md 8절) ── */

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

/** GET /api/members/me/summary */
export interface MySummaryResponse {
  readonly id: number;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly ageRange: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly reviewCount: number;
  readonly averageRating: number | null;
  readonly postCount: number;
  readonly completedPartyCount: number;
  readonly games: readonly {
    readonly code: string;
    readonly name: string;
    readonly isMain: boolean;
    readonly playStyle: string | null;
    readonly playTimeSlot: string | null;
  }[];
  readonly topTags: readonly { readonly rank: number; readonly code: string; readonly label: string; readonly count: number; readonly percent: number }[];
  readonly createdAt: string;
  readonly ageRangePublic: boolean;
}

/** 「별점 평가」 진행 상황. 평가할 수 있는 공고가 아니면 null */
export interface ReviewProgress {
  readonly targetCount: number;
  readonly reviewedCount: number;
}

interface PostSummary {
  readonly id: number;
  readonly category: string;
  readonly game: string;
  readonly gameName: string;
  readonly type: string;
  readonly title: string;
  readonly current: number;
  readonly max: number;
  readonly schedule: string | null;
  readonly scheduleTbd: boolean;
  readonly status: PostStatus;
}

/** GET /api/members/me/posts 아이템 */
export interface MyPostItem extends PostSummary {
  readonly views: number;
  readonly commentCount: number;
  readonly createdAt: string;
  readonly canComplete: boolean;
  readonly review: ReviewProgress | null;
}

/** GET /api/members/me/applications 아이템 */
export interface MyApplicationItem {
  readonly id: number;
  readonly status: ApplicationStatus;
  readonly role: string | null;
  readonly appliedAt: string;
  readonly post: PostSummary & { readonly host: string };
  readonly review: ReviewProgress | null;
}

/** GET /api/members/me/comments 아이템 */
export interface MyCommentItem {
  readonly id: number;
  readonly postId: number;
  readonly postTitle: string;
  readonly game: string;
  readonly gameName: string;
  readonly content: string;
  readonly secret: boolean;
  readonly reply: boolean;
  readonly status: 'VISIBLE' | 'HIDDEN';
  readonly createdAt: string;
}

/** GET /api/members/me/favorites 아이템 */
export interface FavoriteItem {
  readonly id: number;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly mainGame: { readonly code: string; readonly name: string } | null;
  readonly playStyle: string | null;
  readonly favoritedAt: string;
}

/* ── 호출 ── */

const pageQuery = (page: number, size: number) => `page=${page}&size=${size}`;

export const getMySummary = () => request<MySummaryResponse>('GET', '/api/members/me/summary');

export const getMyPosts = (page: number, size: number) => request<Page<MyPostItem>>('GET', `/api/members/me/posts?${pageQuery(page, size)}`);

export const getMyApplications = (status: ApplicationStatus | null, page: number, size: number) =>
  request<Page<MyApplicationItem>>('GET', `/api/members/me/applications?${status ? `status=${status}&` : ''}${pageQuery(page, size)}`);

export const getMyComments = (page: number, size: number) =>
  request<Page<MyCommentItem>>('GET', `/api/members/me/comments?${pageQuery(page, size)}`);

export const getMyFavorites = () => request<readonly FavoriteItem[]>('GET', '/api/members/me/favorites');

export const removeFavorite = (memberId: number) => request<void>('DELETE', `/api/members/me/favorites/${memberId}`);

/* ── 화면용 변환 ── */

const styleLabel = (style: string | null) => styleChoices.find((s) => s.id === style)?.label ?? null;
const accentOf = (gameCode: string) => gameAccents[gameCode] ?? 'blue';

/** ISO → `MM-DD` (브라우저 시간대 기준) */
const toShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatTemperature = (mannerTemp: number) => `${mannerTemp.toFixed(1)}${profileText.temperatureSuffix}`;

export function toProfileSummary(res: MySummaryResponse): ProfileSummary {
  const t = profileText;
  const mainGame = res.games.find((g) => g.isMain) ?? res.games[0];
  const style = mainGame ? [styleLabel(mainGame.playStyle), mainGame.playTimeSlot].filter(Boolean).join(' / ') : '';
  return {
    avatarUrl: res.avatarUrl,
    nickname: res.nickname,
    levelLabel: `${t.levelPrefix}${res.level}`,
    mainGameBadge: mainGame ? `${t.mainGamePrefix}${mainGame.name}` : null,
    fields: [
      { id: 'games', label: t.gamesLabel, value: res.games.length > 0 ? res.games.map((g) => g.name).join(', ') : t.noGames },
      { id: 'style', label: t.styleLabel, value: style || t.noStyle },
    ],
    intro: res.bio ? `"${res.bio}"` : t.noIntro,
    stats: [
      { id: 'posts', label: t.postsLabel, value: String(res.postCount), unit: t.postsUnit },
      { id: 'parties', label: t.partiesLabel, value: String(res.completedPartyCount), unit: t.partiesUnit, highlight: true },
    ],
    rating: {
      score: res.averageRating === null ? t.noRating : res.averageRating.toFixed(1),
      temperature: formatTemperature(res.mannerTemp),
    },
    topTagsCaption: t.reviewCountCaption(res.reviewCount),
    topTags: res.topTags
      .filter((tag) => tag.rank >= 1 && tag.rank <= 3)
      .map((tag) => ({ rank: tag.rank as TopTag['rank'], label: tag.label, percent: `${tag.percent}%` })),
  };
}

/** 「상태 / 조치」 칸: 활동 완료 버튼 → 별점 평가 버튼 → 평가 완료 → 공고 상태 순으로 고릅니다. */
function actionOf(status: PostStatus, canComplete: boolean, review: ReviewProgress | null): ActivityAction {
  const t = activityText;
  if (canComplete) return { kind: 'complete', label: t.complete };
  if (review && review.targetCount > 0) {
    return review.reviewedCount < review.targetCount
      ? { kind: 'review', label: t.review(review.reviewedCount, review.targetCount) }
      : { kind: 'label', label: t.reviewed };
  }
  return { kind: 'label', label: t.postStatus[status] ?? status };
}

const postRowBase = (post: PostSummary, no: number) => ({
  postId: post.id,
  no,
  game: post.gameName,
  accent: accentOf(post.game),
  title: post.title,
  members: `(${post.current}/${post.max})`,
  full: post.current >= post.max,
  to: paths.postDetail(String(post.id)),
});

export const toActivityPost = (item: MyPostItem, no: number): ActivityPost => ({
  ...postRowBase(item, no),
  id: `post-${item.id}`,
  date: toShortDate(item.createdAt),
  action: actionOf(item.status, item.canComplete, item.review),
});

export const toPartyPost = (item: MyApplicationItem, no: number): ActivityPost => ({
  ...postRowBase(item.post, no),
  id: `application-${item.id}`,
  title: `${item.post.title} · ${activityText.hostPrefix}${item.post.host}`,
  date: toShortDate(item.appliedAt),
  action: actionOf(item.post.status, false, item.review),
});

export function toActivityComment(item: MyCommentItem, no: number): ActivityComment {
  const prefix = (item.status === 'HIDDEN' ? activityText.hiddenComment : '') + (item.secret ? activityText.secretComment : '');
  return {
    id: `comment-${item.id}`,
    no,
    game: item.gameName,
    accent: accentOf(item.game),
    postTitle: item.postTitle,
    content: `${prefix}${item.content}`,
    date: toShortDate(item.createdAt),
    to: paths.postDetail(String(item.postId)),
  };
}

export const toFavoriteUser = (item: FavoriteItem): FavoriteUser => ({
  id: item.id,
  name: item.nickname,
  level: item.level,
  detail: item.mainGame ? [item.mainGame.name, styleLabel(item.playStyle)].filter(Boolean).join(' · ') : favoritesText.noMainGame,
  avatarUrl: item.avatarUrl,
  manner: `${favoritesText.mannerPrefix}${formatTemperature(item.mannerTemp)}`,
});
