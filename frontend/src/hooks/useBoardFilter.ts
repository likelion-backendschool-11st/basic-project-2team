import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { BoardPost, SortKey } from '../data/boardData';

const remaining = (p: BoardPost) => p.max - p.current;

const sorters: Record<SortKey, (a: BoardPost, b: BoardPost) => number> = {
  recent: (a, b) => a.order - b.order,
  views: (a, b) => b.views - a.views,
  urgent: (a, b) => remaining(a) - remaining(b) || a.order - b.order,
};

/** 검색어 · 태그 · 마감 제외 · 정렬 상태와 핸들러. 필터링은 하지 않습니다 (서버 조회용 / useBoardFilter 의 기반). */
export function useBoardFilterState() {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<readonly string[]>([]);
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [sort, setSort] = useState<SortKey>('recent');

  return {
    text,
    tags,
    excludeClosed,
    sort,
    /** Stable key describing the current filter state (for pagination reset). */
    filterKey: `${text}|${tags.join(',')}|${excludeClosed}|${sort}`,
    onTextChange: (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    /** Filtering is live; submit just prevents navigation. */
    onSubmit: (e: FormEvent) => e.preventDefault(),
    toggleTag: (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])),
    onExcludeClosedChange: (e: ChangeEvent<HTMLInputElement>) => setExcludeClosed(e.target.checked),
    onSortChange: (e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey),
    reset: () => {
      setText('');
      setTags([]);
      setExcludeClosed(true);
      setSort('recent');
    },
  };
}

/** Text / tag / closed-party filtering + sorting for a post list (client-side, 검색 결과 페이지용). */
export function useBoardFilter(posts: readonly BoardPost[]) {
  const state = useBoardFilterState();
  const { text, tags, excludeClosed, sort } = state;

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return posts
      .filter((p) => !excludeClosed || p.current < p.max)
      .filter((p) => tags.every((t) => p.tags.includes(t)))
      .filter((p) => !needle || `${p.game} ${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice()
      .sort(sorters[sort]);
  }, [posts, text, tags, excludeClosed, sort]);

  return { ...state, filtered };
}
