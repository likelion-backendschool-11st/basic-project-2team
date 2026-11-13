import { ROUTES } from './routes';

export type Accent = 'mercury' | 'amber' | 'sky' | 'purple' | 'blue' | 'emerald' | 'indigo' | 'rose';

export interface Category {
  readonly id: string;
  readonly label: string;
  /** Full Font Awesome class list (solid / brands). */
  readonly icon: string;
  /** 카테고리별 공고 수. 서버(GET /api/categories)에서 불러오기 전이거나 실패하면 없습니다. */
  readonly count?: number;
}

export interface PopularPost {
  readonly id: string;
  readonly category: string;
  readonly accent: Accent;
  readonly time: string;
  readonly title: string;
  readonly voice: { readonly label: string; readonly icon: string; readonly highlight: boolean };
  readonly author: string;
  readonly members: string;
}

export interface UrgentPost {
  readonly id: string;
  readonly deadline: string;
  readonly icon: string;
  readonly slotsLabel: string;
  readonly title: string;
  readonly meta: string;
  readonly actionLabel: string;
  readonly critical?: boolean;
}

export interface MannerLeader {
  readonly id: string;
  readonly rank: 1 | 2 | 3;
  readonly initial: string;
  readonly name: string;
  readonly game: string;
  readonly accent: Accent;
  readonly comment: string;
  readonly temperature: string;
  readonly recommends: string;
}

export interface MannerMember {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly role: string;
  readonly accent: Accent;
  readonly comment: string;
  readonly praise: string;
  readonly mvp: string;
}

export const homeText = {
  loading: '불러오는 중...',
  loadFailed: '불러오지 못했어요. 잠시 후 다시 시도해주세요.',
  popularEmpty: '아직 인기 공고가 없어요.',
  urgentEmpty: '지금 마감 임박한 공고가 없어요.',
  voiceRequired: '음성필수',
  voiceOptional: '음성무관',
  justNow: '방금 전',
  scheduleTbd: '일정 미정',
  nearlyFull: '자리 임박',
  categoryTitle: '카테고리',
  categoryAll: '전체보기',
  quickFilterTitle: '빠른 필터',
  searchPlaceholder: '게임, 던전, 레이드 또는 파티원 검색...',
  createParty: '+ 파티 모집하기',
  popularTitle: '인기 공고글',
  urgentTitle: '마감 임박 글',
  more: '더보기',
  leaderTitle: '매너 온도 랭킹',
  leaderBadge: 'BEST 3',
  leaderLimit: 3,
  /** 「4~6위」 패널에 보여줄 인원. 랭킹은 상위 leaderLimit + memberLimit 명을 한 번에 불러옵니다. */
  memberLimit: 3,
  leaderNoGame: '대표 게임 없음',
  leaderNoTag: '받은 태그 없음',
  leaderReviewCount: (count: number) => `평가 ${count}회`,
  leaderEmpty: '아직 평가를 받은 회원이 없습니다.',
  leaderLoadFailed: '랭킹을 불러오지 못했습니다.',
  memberTitle: '매너 온도 4~6위',
  memberBadge: 'HONOR',
  authorPrefix: '작성자: ',
  lastSlotRibbon: 'LAST 1',
  moreLink: ROUTES.board,
};

/** 카테고리 목록(아이콘·순서). 공고 수만 서버에서 받아 채웁니다. */
export const categories: readonly Category[] = [
  { id: 'mmorpg', label: 'MMORPG', icon: 'fa-solid fa-shield-halved' },
  { id: 'fps', label: 'FPS', icon: 'fa-solid fa-crosshairs' },
  { id: 'aos', label: 'AOS/MOBA', icon: 'fa-solid fa-crown' },
  { id: 'steam', label: 'Steam', icon: 'fa-brands fa-steam' },
  { id: 'etc', label: '기타', icon: 'fa-solid fa-cubes' },
];

/** 공고 카테고리별 태그 색 */
export const categoryAccents: Readonly<Record<string, Accent>> = {
  mmorpg: 'mercury',
  fps: 'sky',
  aos: 'amber',
  steam: 'blue',
  etc: 'purple',
};

/** 「4~6위」 카드의 장식용 색·아이콘 (순서대로 돌려 씁니다) */
export const memberAccents: readonly Accent[] = ['emerald', 'indigo', 'sky'];
export const memberIcons: readonly string[] = ['fa-hand-holding-heart', 'fa-shield-cat', 'fa-bullseye'];

export const quickFilters: readonly string[] = ['#로스트아크', '#롤자랭', '#발로란트'];
