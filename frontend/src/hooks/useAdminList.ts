import { useMemo, useState } from 'react';
import { usePagination } from './usePagination';

export type SortDir = 'desc' | 'asc';

/** The slice of a list the table needs (independent of the filter shape). */
export interface ListView<T> {
  readonly sort: SortDir;
  readonly setSort: (s: SortDir) => void;
  readonly total: number;
  readonly paging: ReturnType<typeof usePagination>;
  readonly visible: readonly T[];
}

/** Filter form (edit → "조회" applies), sort by id, paging — shared by every admin list. */
export function useAdminList<T extends { readonly id: number }, F extends object>(rows: readonly T[], initial: F, match: (row: T, f: F) => boolean, pageSize = 6) {
  const [draft, setDraft] = useState<F>(initial);
  const [applied, setApplied] = useState<F>(initial);
  const [sort, setSort] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const list = rows.filter((r) => match(r, applied));
    return sort === 'desc' ? list : [...list].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `match` is a stable module-level fn at every call site
  }, [rows, applied, sort]);

  const paging = usePagination(filtered.length, pageSize, JSON.stringify(applied) + sort);

  return {
    draft, set: <K extends keyof F>(k: K, v: F[K]) => setDraft((d) => ({ ...d, [k]: v })),
    apply: () => setApplied(draft),
    reset: () => { setDraft(initial); setApplied(initial); },
    sort, setSort, total: filtered.length, paging, visible: filtered.slice(paging.startIndex, paging.endIndex),
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
