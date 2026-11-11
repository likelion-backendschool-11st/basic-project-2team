import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../data/routes';

/** Look up `:param` in `rows`; unknown ids fall back to the first row so a stale link never blanks the page. */
export function useAdminRow<T extends { readonly id: number }>(param: string, rows: readonly T[]) {
  const params = useParams();
  const id = Number(params[param]);
  return rows.find((r) => r.id === id) ?? rows[0];
}

export function useAdminNavigate() {
  const navigate = useNavigate();
  return { toReports: () => navigate(ROUTES.adminReports), toPosts: () => navigate(ROUTES.adminPosts), toHistory: () => navigate(ROUTES.adminHistory) };
}
