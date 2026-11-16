import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { SortKey } from '../data/boardData';

/** 검색어 · 태그 · 마감 제외 · 정렬 상태와 핸들러. 필터링은 하지 않습니다 (서버 조회용: 게시판 · 검색 결과 페이지가 useBoardList 에 넘깁니다). */
export function useBoardFilterState() {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<readonly string[]>([]);
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [game, setGame] = useState('');
  const [time, setTime] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  return {
    text,
    tags,
    excludeClosed,
    game,
    time,
    sort,
    setGame,
    /** Stable key describing the current filter state (for pagination reset). */
    filterKey: `${text}|${tags.join(',')}|${excludeClosed}|${game}|${time}|${sort}`,
    onTextChange: (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    /** Filtering is live; submit just prevents navigation. */
    onSubmit: (e: FormEvent) => e.preventDefault(),
    toggleTag: (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    onExcludeClosedChange: (e: ChangeEvent<HTMLInputElement>) => setExcludeClosed(e.target.checked),
    onGameChange: (e: ChangeEvent<HTMLSelectElement>) => setGame(e.target.value),
    onTimeChange: (e: ChangeEvent<HTMLSelectElement>) => setTime(e.target.value),
    onSortChange: (e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey),
    reset: () => {
      setText('');
      setTags([]);
      setExcludeClosed(true);
      setGame('');
      setTime('');
      setSort('recent');
    },
  };
}
