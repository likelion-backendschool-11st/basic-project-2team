import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination over `totalItems`.
 * `resetKey` — when it changes (e.g. filters/category), jump back to page 1.
 */
export function usePagination(totalItems: number, pageSize: number, resetKey = '', windowSize = 5) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => setPage(1), [resetKey]);

  const current = Math.min(page, totalPages);

  const pages = useMemo(() => {
    const size = Math.min(windowSize, totalPages);
    const start = Math.min(Math.max(1, current - Math.floor(size / 2)), totalPages - size + 1);
    return Array.from({ length: size }, (_, i) => start + i);
  }, [current, totalPages, windowSize]);

  const startIndex = (current - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    page: current,
    pages,
    totalPages,
    startIndex,
    endIndex,
    hasPrev: current > 1,
    hasNext: current < totalPages,
    goTo: (p: number) => setPage(Math.min(Math.max(1, p), totalPages)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
  };
}
