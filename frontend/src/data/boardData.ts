import { ROUTES } from './routes';

/** Stitch screen: "카테고리 게시판 (통합 레이아웃 유지형)" (1c52bc0b4b3c4c0ea50583ec66670d82) */

export type BoardCategoryId = 'all' | 'mmorpg' | 'fps' | 'aos' | 'steam' | 'etc';
export type GameTone = 'indigo' | 'rose' | 'amber' | 'amberDeep' | 'sky' | 'yellow' | 'orange';
export type MembersTone = 'open' | 'few' | 'urgent';
export type PostBadgeTone = 'neutral' | 'rose' | 'brand' | 'brandSoft' | 'urgent';
export type SortKey = 'recent' | 'views' | 'urgent';

export interface BoardCategory {
  readonly id: BoardCategoryId;
  readonly label: string;
  /** Full Font Awesome class list (solid / brands). */
  readonly icon: string;
  /** 카테고리별 공고 수. 서버(GET /api/categories)에서 불러오기 전에는 없습니다. */
  readonly count?: number;
}

export interface PostBadge {
  readonly label: string;
  readonly tone: PostBadgeTone;
  readonly icon?: string;
}

export interface BoardPost {
  readonly id: string;
  readonly category: Exclude<BoardCategoryId, 'all'>;
  readonly game: string;
  readonly gameTone: GameTone;
  readonly title: string;
  readonly current: number;
  readonly max: number;
  readonly membersNote?: string;
  readonly membersTone: MembersTone;
  readonly badge?: PostBadge;
  readonly tags: readonly string[];
  readonly author: string;
  readonly date: string;
  readonly views: number;
  /** Lower = written more recently. */
  readonly order: number;
}

export interface SortOption {
  readonly value: SortKey;
  readonly label: string;
}

export interface FilterChip {
  readonly label: string;
  readonly value: string;
}

export const DEFAULT_BOARD_CATEGORY: BoardCategoryId = 'mmorpg';
export const BOARD_PAGE_SIZE = 8;

export const boardCategories: readonly BoardCategory[] = [
  { id: 'all', label: '전체 카테고리', icon: 'fa-solid fa-globe', count: 542 },
  { id: 'mmorpg', label: 'MMORPG', icon: 'fa-solid fa-shield-halved', count: 142 },
  { id: 'fps', label: 'FPS', icon: 'fa-solid fa-crosshairs', count: 89 },
  { id: 'aos', label: 'AOS/MOBA', icon: 'fa-solid fa-crown', count: 210 },
  { id: 'steam', label: 'Steam', icon: 'fa-brands fa-steam', count: 56 },
  { id: 'etc', label: '기타', icon: 'fa-solid fa-shapes', count: 45 },
];

export const sortOptions: readonly SortOption[] = [
  { value: 'recent', label: '최신순' },
  { value: 'views', label: '조회수순' },
  { value: 'urgent', label: '마감임박순' },
];

export const boardTagFilters: readonly FilterChip[] = [
  { label: '#트라이', value: '트라이' },
  { label: '#레이드', value: '레이드' },
  { label: '#고정팟', value: '고정팟' },
];

/** Shared copy for the board/search layout. */
export const boardText = {
  searchLabel: '검색 :',
  resultPrefix: '검색 결과 ',
  resultSuffix: '건',
  searchButton: '검색',
  resetButton: '초기화',
  clearCategoryTitle: '카테고리 초기화',
  filterLabel: '상세 필터 :',
  gameFilterLabel: '게임명: ',
  timeFilterLabel: '시간: ',
  timeFilterAll: '전체 시간대',
  excludeClosed: '모집 마감 제외',
  categoryTitle: '카테고리',
  categoryAll: '전체보기',
  tipTitle: '파티 구인 팁',
  tipBody: '원하는 시간대(예: 8시, 20시)나 선호 보이스(디스코드, 인게임챗)를 검색창에 조합해보세요!',
  liveList: '실시간 매칭 리스트',
  sortLabel: '정렬:',
  columns: { no: 'NO', title: '제목', author: '작성자', date: '작성일', views: '조회' },
  totalPrefix: '총 ',
  totalMiddle: '개 중 ',
  totalSuffix: ' 표시 중',
  write: '글쓰기',
  empty: '조건에 맞는 게시글이 없습니다.',
  loadFailed: '게시글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  badgeClosed: '모집마감',
  badgeCompleted: '종료',
  badgeUrgent: '마감임박',
  badgeVoice: '음성필수',
  prevPage: '이전 페이지',
  nextPage: '다음 페이지',
  categoryPlaceholder: (label: string) => `${label} 내 검색 또는 게임명, 태그를 입력해주세요...`,
  categoryCountLabel: (label: string) => `${label} 카테고리 (총 `,
  categoryCountSuffix: '건)',
  gameFilterAll: (label: string) => (label === '전체 카테고리' ? '전체' : `전체 ${label}`),
};

/** 게임 코드(GET /api/posts 의 game) → 게임 배지 색. 목록에 없는 게임은 indigo. */
export const gameTones: Readonly<Record<string, GameTone>> = {
  lostark: 'indigo',
  ff14: 'indigo',
  valorant: 'rose',
  apex: 'rose',
  dota2: 'rose',
  lol: 'amber',
  tft: 'amber',
  overwatch: 'orange',
  pubg: 'amberDeep',
  wow: 'yellow',
  maplestory: 'sky',
  helldivers2: 'sky',
  monsterhunter: 'sky',
  minecraft: 'sky',
};

export const boardRoutes = {
  write: ROUTES.postWrite,
  post: ROUTES.board,
};

const seedPosts: readonly Omit<BoardPost, 'id' | 'order'>[] = [
  { category: 'mmorpg', game: '로스트아크', gameTone: 'indigo', title: '종익 트라이 저녁 8시부터 가실분', current: 3, max: 8, membersTone: 'open', badge: { label: '디코', tone: 'neutral', icon: 'fa-solid fa-microphone' }, tags: ['트라이'], author: '짱구', date: '11-10', views: 38 },
  { category: 'mmorpg', game: '로스트아크', gameTone: 'indigo', title: '모르둠 익스 빡숙 11시팟 가실분', current: 2, max: 8, membersTone: 'open', badge: { label: '디코', tone: 'neutral', icon: 'fa-solid fa-microphone' }, tags: ['레이드'], author: '철수', date: '11-10', views: 31 },
  { category: 'mmorpg', game: '던전앤파이터', gameTone: 'rose', title: '나벨 레이드 10시에 갈 사람 구함', current: 6, max: 8, membersTone: 'open', badge: { label: '버퍼급구', tone: 'rose' }, tags: ['레이드'], author: '유리', date: '11-10', views: 43 },
  { category: 'mmorpg', game: '검은사막', gameTone: 'amber', title: '혹시 7시부터 사당 같이 하실분 있나요', current: 1, max: 3, membersTone: 'few', tags: [], author: '훈이', date: '11-10', views: 15 },
  { category: 'mmorpg', game: '메이플스토리', gameTone: 'sky', title: '하드 윌드릭스 8시쯤부터 가실분', current: 4, max: 6, membersTone: 'open', tags: ['레이드'], author: '맹구', date: '11-10', views: 48 },
  { category: 'mmorpg', game: 'WoW', gameTone: 'yellow', title: '[World of Warcraft] 9시부터 신화 돌 아재들 구함', current: 3, max: 5, membersTone: 'open', badge: { label: '음성필수', tone: 'neutral' }, tags: ['고정팟'], author: '나미리', date: '11-10', views: 34 },
  { category: 'mmorpg', game: '파이널판타지14', gameTone: 'indigo', title: '영식 4층 후반 트라이팟 모십니다', current: 5, max: 8, membersTone: 'open', badge: { label: '힐러급구', tone: 'brand' }, tags: ['트라이'], author: '수지', date: '11-10', views: 27 },
  { category: 'mmorpg', game: '로스트아크', gameTone: 'indigo', title: '카멘 하드 1-3관 반고정 랏서폿 구인', current: 7, max: 8, membersTone: 'urgent', badge: { label: '마감임박', tone: 'urgent' }, tags: ['고정팟', '레이드'], author: '훈이', date: '11-10', views: 52 },
  { category: 'fps', game: '발로란트', gameTone: 'rose', title: '초월자 듀오나 3인팟 브리핑 칼같이 하실 분', current: 2, max: 3, membersTone: 'open', badge: { label: '디코', tone: 'neutral', icon: 'fa-solid fa-microphone' }, tags: ['고정팟'], author: '제트원챔', date: '11-10', views: 41 },
  { category: 'fps', game: '배틀그라운드', gameTone: 'amberDeep', title: '스쿼드 치킨 뜯을 파티원 (마이크 가능자)', current: 3, max: 4, membersTone: 'open', tags: [], author: '짱구', date: '11-10', views: 29 },
  { category: 'fps', game: '오버워치 2', gameTone: 'orange', title: '마스터 경쟁전 힐러님 급구합니다', current: 4, max: 5, membersTone: 'urgent', badge: { label: '마감임박', tone: 'urgent' }, tags: ['트라이'], author: '훈이', date: '11-10', views: 36 },
  { category: 'aos', game: '리그 오브 레전드', gameTone: 'amber', title: '에메랄드~다이아 자유랭크 5인큐 서포터/정글 구합니다', current: 3, max: 5, membersTone: 'open', badge: { label: '듣톡가능', tone: 'neutral' }, tags: ['고정팟'], author: '페이커팬', date: '11-10', views: 57 },
  { category: 'aos', game: '리그 오브 레전드', gameTone: 'amber', title: '칼바람 즐겜 5인 모집', current: 1, max: 5, membersTone: 'few', tags: [], author: '철수', date: '11-10', views: 12 },
  { category: 'steam', game: '몬스터헌터', gameTone: 'sky', title: '역전왕 토벌 같이 트라이 하실분', current: 2, max: 4, membersTone: 'open', tags: ['트라이'], author: '맹구', date: '11-10', views: 22 },
  { category: 'etc', game: '마인크래프트', gameTone: 'sky', title: '야생 서버 같이 건축하실 분', current: 3, max: 10, membersTone: 'open', tags: ['고정팟'], author: '수지', date: '11-10', views: 18 },
];

/** Mock list: cycles the seed rows per category up to each category's post count. */
export const boardPosts: readonly BoardPost[] = boardCategories
  .filter((c) => c.id !== 'all')
  .flatMap((c) => {
    const seeds = seedPosts.filter((p) => p.category === c.id);
    return Array.from({ length: c.count ?? 0 }, (_, i) => {
      const seed = seeds[i % seeds.length];
      const cycle = Math.floor(i / seeds.length);
      return { ...seed, id: `${c.id}-${i}`, order: i, views: Math.max(1, seed.views - cycle * 2) };
    });
  });
