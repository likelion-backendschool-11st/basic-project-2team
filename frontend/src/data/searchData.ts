import type { BoardPost, FilterChip } from './boardData';

/** Stitch screen: "검색 결과 페이지" (59724bb63c7a498ab3b6a4dc4d2bd191) */

export const SEARCH_RESULT_TOTAL = 28;

export const searchText = {
  placeholder: '새 검색어를 입력하거나 추가 태그를 적어주세요...',
  searchButton: '재검색',
  clearQueryTitle: '검색어 제거',
  gameFilterAll: '전체',
  /** Time chip label shown when the query matches a time keyword. */
  timeFilterFor: (q: string) => {
    const m = q.match(/(\d{1,2})\s*시/);
    if (!m) return null;
    const h = Number(m[1]);
    const start = h < 12 ? h + 12 : h;
    const pad = (n: number) => String(n % 24).padStart(2, '0');
    return `${pad(start)}:00 ~ ${pad(start + 1)}:00 (${h}시)`;
  },
  relatedPrefix: '검색어 "',
  relatedSuffix: '" 관련 게시글',
  allResults: '전체 게시글',
};

export const searchTagFilters: readonly FilterChip[] = [
  { label: '#트라이', value: '트라이' },
  { label: '#자랭5인', value: '자랭5인' },
  { label: '#즐겜러', value: '즐겜러' },
];

const seedResults: readonly Omit<BoardPost, 'id' | 'order'>[] = [
  { category: 'mmorpg', game: '로스트아크', gameTone: 'indigo', title: '종익 트라이 저녁 8시부터 가실분', current: 3, max: 8, membersTone: 'open', badge: { label: '디코', tone: 'neutral', icon: 'fa-solid fa-microphone' }, tags: ['트라이'], author: '짱구', date: '11-10', views: 38 },
  { category: 'aos', game: '리그 오브 레전드', gameTone: 'amber', title: '자랭 5인큐 8시부터 하실분', current: 1, max: 5, membersTone: 'open', badge: { label: '듣톡가능', tone: 'neutral' }, tags: ['자랭5인'], author: '철수', date: '11-10', views: 31 },
  { category: 'fps', game: '발로란트', gameTone: 'rose', title: '8시 5인큐 즐겜러모임 가실분', current: 2, max: 5, membersTone: 'open', badge: { label: '브리핑 칼답', tone: 'neutral' }, tags: ['즐겜러'], author: '유리', date: '11-10', views: 43 },
  { category: 'fps', game: '오버워치 2', gameTone: 'orange', title: '다이아~마스터 8시 3인큐 가실분', current: 1, max: 3, membersTone: 'few', badge: { label: '힐러모심', tone: 'brandSoft' }, tags: [], author: '훈이', date: '11-10', views: 15 },
  { category: 'mmorpg', game: '메이플스토리', gameTone: 'sky', title: '하드 윌드릭스 8시쯤부터 가실분', current: 4, max: 6, membersTone: 'open', tags: [], author: '맹구', date: '11-10', views: 48 },
  { category: 'mmorpg', game: 'WoW', gameTone: 'yellow', title: '[World of Warcraft] 8시부터 신화 돌 아재들 구함', current: 3, max: 5, membersTone: 'open', badge: { label: '음성필수', tone: 'neutral' }, tags: [], author: '나미리', date: '11-10', views: 34 },
  { category: 'mmorpg', game: '로스트아크', gameTone: 'indigo', title: '카멘 하드 1-3관 8시 반 고정 구인', current: 7, max: 8, membersNote: '(랏서폿)', membersTone: 'urgent', badge: { label: '마감임박', tone: 'urgent' }, tags: ['트라이'], author: '훈이', date: '11-10', views: 52 },
  { category: 'fps', game: '배틀그라운드', gameTone: 'amberDeep', title: '8시 스쿼드 치킨 뜯을 파티원 (마이크 가능자)', current: 3, max: 4, membersTone: 'open', tags: ['즐겜러'], author: '짱구', date: '11-10', views: 29 },
];

/** Mock search index: seed rows cycled up to the design's result total. */
export const searchIndex: readonly BoardPost[] = Array.from({ length: SEARCH_RESULT_TOTAL }, (_, i) => {
  const seed = seedResults[i % seedResults.length];
  const cycle = Math.floor(i / seedResults.length);
  return { ...seed, id: `search-${i}`, order: i, views: Math.max(1, seed.views - cycle * 3) };
});
