import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../data/routes';

/** Reads `?q=` (the committed search keyword); supports re-search / clear. 결과는 useBoardList 가 서버에서 조회합니다. */
export function useSearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get('q') ?? '').trim();
  const [draft, setDraft] = useState('');

  useEffect(() => setDraft(''), [q]);

  const go = (next: string) => navigate(next ? `${ROUTES.search}?q=${encodeURIComponent(next)}` : ROUTES.search);

  return {
    q,
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
