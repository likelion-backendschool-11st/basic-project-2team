import { useEffect, useState } from 'react';
import { getPosts, toBoardPost } from '../api/boardApi';
import { ApiRequestError } from '../api/http';
import { BOARD_PAGE_SIZE, boardText, type BoardCategoryId, type BoardPost } from '../data/boardData';
import type { useBoardFilterState } from './useBoardFilter';
import { usePagination } from './usePagination';

const SEARCH_DEBOUNCE_MS = 300;

/** 입력이 멈춘 뒤 delay 가 지나면 값이 반영됩니다 (타이핑마다 서버를 호출하지 않기 위해). */
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * 게시판 목록을 서버(GET /api/posts)에서 조회합니다. 카테고리·검색어·태그·마감 제외·정렬·페이지가 바뀌면 다시 불러오고,
 * 응답이 늦게 도착한 이전 요청은 무시합니다.
 */
export function useBoardList(categoryId: BoardCategoryId, filter: ReturnType<typeof useBoardFilterState>) {
  const [posts, setPosts] = useState<readonly BoardPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = useDebouncedValue(filter.text, SEARCH_DEBOUNCE_MS);
  const tagsKey = filter.tags.join(',');
  const pg = usePagination(total, BOARD_PAGE_SIZE, `${categoryId}|${q}|${tagsKey}|${filter.excludeClosed}|${filter.sort}`);
  const { excludeClosed, sort } = filter;
  const page = pg.page;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPosts({
      category: categoryId === 'all' ? undefined : categoryId,
      q,
      sort,
      tags: tagsKey ? tagsKey.split(',') : [],
      page,
      size: BOARD_PAGE_SIZE,
      excludeClosed,
    })
      .then((result) => {
        if (cancelled) return;
        setPosts(result.items.map((item, i) => toBoardPost(item, i)));
        setTotal(result.totalCount);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : boardText.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, q, tagsKey, excludeClosed, sort, page]);

  return { posts, total, loading, error, pagination: pg };
}
