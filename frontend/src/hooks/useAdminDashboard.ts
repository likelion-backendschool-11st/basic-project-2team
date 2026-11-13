import { useEffect, useState } from 'react';
import { getDashboard, listReports, type AdminDashboard, type AdminReport } from '../api/adminApi';
import { DASHBOARD_REPORT_COUNT } from '../data/adminData';
import { useAdminErrorMessage } from './useAdminSession';

/** 대시보드 통계와 최근 신고 몇 건을 함께 불러옵니다. */
export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboard | null>(null);
  const [reports, setReports] = useState<readonly AdminReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const toMessage = useAdminErrorMessage();

  useEffect(() => {
    let ignore = false;
    Promise.all([getDashboard(), listReports({ page: 1, size: DASHBOARD_REPORT_COUNT })])
      .then(([dashboard, page]) => {
        if (ignore) return;
        setStats(dashboard);
        setReports(page.items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(toMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, toMessage]);

  return { stats, reports, error, reload: () => setReloadKey((k) => k + 1) };
}
