import { ROUTES } from './routes';

export type Accent = 'mercury' | 'amber' | 'sky' | 'purple' | 'blue' | 'emerald' | 'indigo' | 'rose';

export interface Category {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly count: number;
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
  leaderNoGame: '대표 게임 없음',
  leaderNoTag: '받은 태그 없음',
  leaderReviewCount: (count: number) => `평가 ${count}회`,
  leaderEmpty: '아직 평가를 받은 회원이 없습니다.',
  leaderLoadFailed: '랭킹을 불러오지 못했습니다.',
  memberTitle: '이달의 매너 파티원',
  memberBadge: 'HONOR',
  authorPrefix: '작성자: ',
  lastSlotRibbon: 'LAST 1',
  moreLink: ROUTES.board,
};

export const categories: readonly Category[] = [
  { id: 'mmorpg', label: 'MMORPG', icon: 'fa-shield-halved', count: 142 },
  { id: 'fps', label: 'FPS', icon: 'fa-crosshairs', count: 89 },
  { id: 'aos', label: 'AOS/MOBA', icon: 'fa-crown', count: 210 },
  { id: 'etc', label: '기타', icon: 'fa-cubes', count: 45 },
];

export const quickFilters: readonly string[] = ['#로스트아크', '#롤자랭', '#발로란트'];

export const popularPosts: readonly PopularPost[] = [
  {
    id: 'p1',
    category: 'MMORPG',
    accent: 'mercury',
    time: '방금 전',
    title: '[로스트아크] 카멘 하드 1-3관 숙련 랏서폿 모심 (1630+)',
    voice: { label: '음성필수', icon: 'fa-brands fa-discord', highlight: true },
    author: '빛의바드',
    members: '7/8',
  },
  {
    id: 'p2',
    category: 'AOS/MOBA',
    accent: 'amber',
    time: '12분 전',
    title: '[롤] 에메랄드~다이아 자유랭크 5인큐 서포터/정글 구합니다',
    voice: { label: '듣톡가능', icon: 'fa-solid fa-microphone-slash', highlight: false },
    author: '페이커팬',
    members: '3/5',
  },
  {
    id: 'p3',
    category: 'FPS',
    accent: 'sky',
    time: '25분 전',
    title: '[발로란트] 초월자 듀오나 3인팟 브리핑 칼같이 하실 분',
    voice: { label: '디코마이크', icon: 'fa-brands fa-discord', highlight: true },
    author: '제트원챔',
    members: '2/3',
  },
  {
    id: 'p4',
    category: 'MMORPG',
    accent: 'mercury',
    time: '30분 전',
    title: '[WoW] 신화 네룹아르 궁전 1-4넴 반고정 확손팟',
    voice: { label: '음성필수', icon: 'fa-brands fa-discord', highlight: true },
    author: '아제로스전사',
    members: '18/20',
  },
];

export const urgentPosts: readonly UrgentPost[] = [
  {
    id: 'u1',
    deadline: '마감 5분 전',
    icon: 'fa-fire',
    slotsLabel: '1자리 남음',
    title: '[로스트아크] 에키드나 하드 랏딜러 바로 출발합니다',
    meta: '출발 예정: 22:30 즉출',
    actionLabel: '빠른신청',
    critical: true,
  },
  {
    id: 'u2',
    deadline: '마감 10분 전',
    icon: 'fa-stopwatch',
    slotsLabel: '1명 구인',
    title: '[오버워치 2] 마스터 경쟁전 힐러님 급구합니다 (아나/키리코)',
    meta: '진행상황: 4/5 완료',
    actionLabel: '참가',
  },
  {
    id: 'u3',
    deadline: '마감 15분 전',
    icon: 'fa-stopwatch',
    slotsLabel: '2명 구인',
    title: '[배틀그라운드] 스쿼드 치킨 뜯으실 분 오더 가능 환영',
    meta: '음성: 인게임 보이스',
    actionLabel: '참가',
  },
  {
    id: 'u4',
    deadline: '마감 20분 전',
    icon: 'fa-stopwatch',
    slotsLabel: '마지막 1명',
    title: '[FF14] 절 오메가 검증전 트라이팟 탱커(건브/전사)',
    meta: '출발: 23:00 정각',
    actionLabel: '참가',
  },
];

export const mannerMembers: readonly MannerMember[] = [
  { id: 'm1', icon: 'fa-hand-holding-heart', name: '힐러의미덕', role: '서포터', accent: 'emerald', comment: '"군말없이 케어 최고예요"', praise: '칭찬 87회', mvp: 'MVP 24회' },
  { id: 'm2', icon: 'fa-shield-cat', name: '든든한탱커', role: '탱커', accent: 'indigo', comment: '"끝까지 포기 안 하는 파티원"', praise: '칭찬 72회', mvp: 'MVP 19회' },
  { id: 'm3', icon: 'fa-bullseye', name: '즐겜러원딜', role: '딜러', accent: 'sky', comment: '"분위기 메이커 유쾌해요"', praise: '칭찬 65회', mvp: 'MVP 15회' },
];
