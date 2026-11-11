import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../data/routes';

export function useSearch(initial = '') {
  const [query, setQuery] = useState(initial);
  const navigate = useNavigate();

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `${ROUTES.search}?q=${encodeURIComponent(q)}` : ROUTES.search);
  };

  return { query, onChange, onSubmit };
}
