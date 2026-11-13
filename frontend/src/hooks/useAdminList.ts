import { useCallback, useEffect, useState } from 'react';
import type { ListQuery, Page, SortOrder } from '../api/adminApi';
import { ADMIN_PAGE_SIZE } from '../data/adminData';
import { useAdminErrorMessage } from './useAdminSession';
import { usePagination } from './usePagination';

export type SortDir = SortOrder;

/** The slice of a list the table needs (independent of the filter shape). */
export interface ListView<T> {
  readonly sort: SortDir;
  readonly setSort: (s: SortDir) => void;
  readonly total: number;
  readonly paging: ReturnType<typeof usePagination>;
  readonly visible: readonly T[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
}

/**
 * Filter form (edit → "조회" applies), sort, server-side paging — shared by every admin list.
 * `toQuery` turns the applied filter into API query params; `fetchPage` calls the list API.
 */
export function useAdminList<T extends { readonly id: number }, F extends object, Q extends ListQuery>(
  fetchPage: (query: Q) => Promise<Page<T>>,
  initial: F,
  toQuery: (f: F) => Omit<Q, 'page' | 'size' | 'sort'>,
  pageSize = ADMIN_PAGE_SIZE,
) {
  const [draft, setDraft] = useState<F>(initial);
  const [applied, setApplied] = useState<F>(initial);
  const [sort, setSort] = useState<SortDir>('desc');
  const [result, setResult] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const toMessage = useAdminErrorMessage();

  const paging = usePagination(result?.totalCount ?? 0, pageSize, JSON.stringify(applied) + sort);
  const page = paging.page;

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchPage({ ...toQuery(applied), page, size: pageSize, sort } as Q)
      .then((data) => {
        if (ignore) return;
        setResult(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(toMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fetchPage` / `toQuery` are stable module-level fns at every call site
  }, [applied, sort, page, pageSize, reloadKey, toMessage]);

  return {
    draft,
    set: <K extends keyof F>(k: K, v: F[K]) => setDraft((d) => ({ ...d, [k]: v })),
    apply: () => setApplied(draft),
    reset: () => {
      setDraft(initial);
      setApplied(initial);
    },
    sort,
    setSort,
    total: result?.totalCount ?? 0,
    paging,
    visible: result?.items ?? [],
    loading,
    error,
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
  };
}

/** Row selection for bulk actions (delete / hide / restore). */
export function useSelection() {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  return {
    selected,
    toggle: (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    setAll: (ids: readonly number[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; }),
    clear: () => setSelected(new Set()),
  };
}
