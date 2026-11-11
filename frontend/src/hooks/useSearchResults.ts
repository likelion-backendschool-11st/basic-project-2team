import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchIndex } from '../data/searchData';
import { ROUTES } from '../data/routes';

/** Reads `?q=` and filters the mock search index by it; supports re-search / clear. */
export function useSearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get('q') ?? '').trim();
  const [draft, setDraft] = useState('');

  useEffect(() => setDraft(''), [q]);

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return searchIndex;
    return searchIndex.filter((p) => `${p.game} ${p.title} ${p.tags.join(' ')}`.toLowerCase().includes(needle));
  }, [q]);

  const go = (next: string) => navigate(next ? `${ROUTES.search}?q=${encodeURIComponent(next)}` : ROUTES.search);

  return {
    q,
    results,
    draft,
    onDraftChange: (e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onSubmit: (e?: FormEvent) => {
      e?.preventDefault();
      const next = draft.trim();
      go(next || q);
    },
    clearQuery: () => go(''),
  };
}
