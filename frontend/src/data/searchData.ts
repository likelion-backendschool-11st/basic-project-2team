import type { FilterChip } from './boardData';

/** Stitch screen: "검색 결과 페이지" (59724bb63c7a498ab3b6a4dc4d2bd191) */

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
