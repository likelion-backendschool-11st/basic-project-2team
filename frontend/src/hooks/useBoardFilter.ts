import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import type { SortKey } from '../data/boardData';

/** 검색어 · 태그 · 마감 제외 · 정렬 상태와 핸들러. 필터링은 하지 않습니다 (서버 조회용: 게시판 · 검색 결과 페이지가 useBoardList 에 넘깁니다). */
/** 상세 필터 값 (빈 문자열 = 전체). voice 만 체크박스라 boolean 입니다. */
export interface DetailFilter {
  readonly type: string;
  /** 상세 분류 코드 (게임 → 모집 유형 → 상세 분류 순으로 좁혀 고릅니다) */
  readonly detail: string;
  readonly style: string;
  readonly headcount: string;
  readonly date: string;
  readonly voice: boolean;
}
const NO_DETAIL: DetailFilter = { type: '', detail: '', style: '', headcount: '', date: '', voice: false };

export function useBoardFilterState() {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<readonly string[]>([]);
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [game, setGameState] = useState('');
  const [time, setTime] = useState('');
  const [detail, setDetail] = useState<DetailFilter>(NO_DETAIL);
  // 게임이 바뀌면 그 게임에 속한 모집 유형·상세 분류 선택은 의미가 없으므로 함께 비웁니다.
  const setGame = useCallback((code: string) => {
    setGameState(code);
    setDetail((prev) => ({ ...prev, type: '', detail: '' }));
  }, []);
  const [sort, setSort] = useState<SortKey>('recent');

  return {
    text,
    tags,
    excludeClosed,
    game,
    time,
    detail,
    sort,
    setGame,
    /** Stable key describing the current filter state (for pagination reset). */
    filterKey: `${text}|${tags.join(',')}|${excludeClosed}|${game}|${time}|${Object.values(detail).join(',')}|${sort}`,
    onTextChange: (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    /** Filtering is live; submit just prevents navigation. */
    onSubmit: (e: FormEvent) => e.preventDefault(),
    toggleTag: (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    onExcludeClosedChange: (e: ChangeEvent<HTMLInputElement>) => setExcludeClosed(e.target.checked),
    onGameChange: (e: ChangeEvent<HTMLSelectElement>) => setGame(e.target.value),
    onTimeChange: (e: ChangeEvent<HTMLSelectElement>) => setTime(e.target.value),
    onDetailChange: <K extends keyof DetailFilter>(key: K, value: DetailFilter[K]) => setDetail((prev) => ({ ...prev, [key]: value, ...(key === 'type' ? { detail: '' } : {}) })),
    onSortChange: (e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey),
    reset: () => {
      setText('');
      setTags([]);
      setExcludeClosed(true);
      setGameState('');
      setTime('');
      setDetail(NO_DETAIL);
      setSort('recent');
    },
  };
}
