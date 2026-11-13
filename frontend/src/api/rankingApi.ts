import { homeText, type Accent, type MannerLeader } from '../data/homeData';
import { request } from './http';

/** GET /api/rankings/manner 아이템 (docs/API_SPEC.md 8절) */
export interface MannerRankingItem {
  readonly rank: number;
  readonly id: number;
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly reviewCount: number;
  readonly mainGame: { readonly code: string; readonly name: string } | null;
  readonly topTag: { readonly code: string; readonly label: string } | null;
}

export const getMannerRanking = (limit: number) => request<readonly MannerRankingItem[]>('GET', `/api/rankings/manner?limit=${limit}`);

const rankAccents: readonly Accent[] = ['mercury', 'purple', 'blue'];

/** 상위 3명만 「이달의 매너 공대장」 카드로 바꿉니다. */
export const toMannerLeaders = (items: readonly MannerRankingItem[]): readonly MannerLeader[] =>
  items
    .filter((item) => item.rank >= 1 && item.rank <= 3)
    .map((item) => ({
      id: String(item.id),
      rank: item.rank as MannerLeader['rank'],
      initial: item.nickname.slice(0, 1),
      name: item.nickname,
      game: item.mainGame?.name ?? homeText.leaderNoGame,
      accent: rankAccents[item.rank - 1] ?? 'mercury',
      comment: item.topTag?.label ?? homeText.leaderNoTag,
      temperature: `${item.mannerTemp.toFixed(1)}°C`,
      recommends: homeText.leaderReviewCount(item.reviewCount),
    }));
