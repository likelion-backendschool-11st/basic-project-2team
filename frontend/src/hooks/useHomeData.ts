import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '../api/boardApi';
import { errorMessageOf } from '../api/http';
import { getPopularPosts, getUrgentPosts, toPopularPost, toUrgentPost } from '../api/homeApi';
import { categories as categoryList, homeText, type Category } from '../data/homeData';

interface Remote<T> {
  readonly data: T;
  readonly loading: boolean;
  readonly error: string | null;
}

/** 화면이 열릴 때 한 번 불러옵니다. 언마운트되면 늦게 도착한 응답은 무시합니다. */
function useRemote<R, T>(fetcher: () => Promise<R>, map: (result: R) => T, initial: T): Remote<T> {
  const [state, setState] = useState<Remote<T>>({ data: initial, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => !cancelled && setState({ data: map(result), loading: false, error: null }))
      .catch((err: unknown) => !cancelled && setState({ data: initial, loading: false, error: errorMessageOf(err, homeText.loadFailed) }));
    return () => {
      cancelled = true;
    };
    // fetcher · map · initial 은 모듈 상수라 다시 만들어지지 않습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

const NO_POPULAR: readonly ReturnType<typeof toPopularPost>[] = [];
const NO_URGENT: readonly ReturnType<typeof toUrgentPost>[] = [];

/** 메인 인기 공고 (GET /api/posts/popular) */
export const usePopularPosts = () =>
  useRemote(getPopularPosts, (items) => items.map((item) => toPopularPost(item)), NO_POPULAR);

/** 메인 마감 임박 공고 (GET /api/posts/urgent) */
export const useUrgentPosts = () =>
  useRemote(getUrgentPosts, (items) => items.map((item) => toUrgentPost(item)), NO_URGENT);

/** 카테고리 목록에 서버의 공고 수(GET /api/categories)를 채웁니다. 실패하면 공고 수만 숨기고 목록은 그대로 보여줍니다. */
export function useHomeCategories(): readonly Category[] {
  const [counts, setCounts] = useState<ReadonlyMap<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => !cancelled && setCounts(new Map(list.map((c) => [c.code, c.postCount]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => categoryList.map((c) => ({ ...c, count: counts?.get(c.id) })), [counts]);
}
