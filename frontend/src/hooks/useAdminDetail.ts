import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import { useAdminErrorMessage } from './useAdminSession';

/** `:param` as a positive integer id, or null for a malformed link. */
export function useAdminId(param: string) {
  const params = useParams();
  const id = Number(params[param]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Loads one admin resource (`load(id)`), re-running when the id changes or `reload()` is called.
 * A malformed id shows an error instead of calling the API.
 */
export function useAdminResource<T>(id: number | null, load: (id: number) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const toMessage = useAdminErrorMessage();

  useEffect(() => {
    if (id === null) {
      setError('잘못된 주소입니다.');
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoading(true);
    load(id)
      .then((value) => {
        if (ignore) return;
        setData(value);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is a stable module-level API fn at every call site
  }, [id, reloadKey, toMessage]);

  return { data, error, loading, reload: useCallback(() => setReloadKey((k) => k + 1), []) };
}

export function useAdminNavigate() {
  const navigate = useNavigate();
  return { toReports: () => navigate(ROUTES.adminReports), toPosts: () => navigate(ROUTES.adminPosts), toHistory: () => navigate(ROUTES.adminHistory) };
}
