import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminLoadState from '../../components/admin/AdminLoadState';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminText, dashboardText as t, displayName, formatDateTime, reportStatusLabel, reportStatusTone, reportTypeLabel, sanctionPeriod, sanctionTypeLabel } from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

const pill = 'px-4 py-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-xs text-indigo-200 hover:bg-indigo-500/20 whitespace-nowrap';
const statKeys = ['pendingReportCount', 'todayReportCount', 'openPostCount', 'recentSanctionCount'] as const;

/** Stitch screen: "대시보드" */
export const AdminDashboardPage: React.FC = () => {
  const { stats, reports, error, reload } = useAdminDashboard();
  return (
    <AdminLayout title="대시보드" description={t.description}>
      {!stats ? (
        <AdminLoadState loading={!error} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {statKeys.map((key) => (
              <div key={key} className="rounded-3xl border border-night-borderLight bg-night-surface p-6">
                <div className="text-sm text-fog-sub">{t.stats[key]}{key === 'recentSanctionCount' && <span className="text-xs text-fog-muted"> (최근 {stats.recentSanctionDays}일)</span>}</div>
                <div className="mt-3 text-5xl font-bold text-indigo-400">{stats[key]}<span className="text-xl text-fog-headline ml-1">건</span></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-6 items-start">
            <AdminCard title={t.recentReports} aside={<Link to={ROUTES.adminReports} className={pill}>{t.toReports}</Link>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-fog-muted border-b border-night-borderLight"><tr>{['접수 일시', '신고 유형', '신고 사유', '신고 대상', '상태', '처리'].map((h) => <th key={h} className="py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-night-borderLight">
                    {reports.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-fog-muted">{adminText.empty}</td></tr>}
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td className="py-4 font-mono text-xs">{formatDateTime(r.createdAt)}</td>
                        <td className="py-4">{reportTypeLabel[r.type]}</td>
                        <td className="py-4 font-semibold text-white">{r.reason}</td>
                        <td className="py-4">{displayName(r.target.nickname)}</td>
                        <td className="py-4"><StatusBadge tone={reportStatusTone[r.status]}>{reportStatusLabel[r.status]}</StatusBadge></td>
                        <td className="py-4"><Link to={paths.adminReportDetail(String(r.id))} className="text-indigo-300 hover:text-indigo-200">{adminText.detail}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
            <AdminCard title={t.recentSanctions}>
              <Link to={ROUTES.adminHistory} className={`${pill} inline-block mb-4`}>{t.toHistory}</Link>
              {stats.recentSanctions.length === 0 && <p className="py-6 text-center text-sm text-fog-muted">{t.noSanctions}</p>}
              <ul className="divide-y divide-night-borderLight">
                {stats.recentSanctions.map((s) => {
                  const period = sanctionPeriod(s.type, s.startsAt, s.endsAt);
                  return (
                    <li key={s.id} className="py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Link to={paths.adminMemberDetail(String(s.member.id))} className="hover:underline">{displayName(s.member.nickname)}</Link>
                        <StatusBadge tone={s.type === 'WARNING' ? 'amber' : 'rose'}>{sanctionTypeLabel[s.type]}{s.type === 'SUSPEND' && ` ${period}`}</StatusBadge>
                      </div>
                      <div className="flex justify-between gap-3 text-xs text-fog-sub mt-1.5"><span className="min-w-0 truncate">{s.reason}</span><span className="text-fog-muted shrink-0">{formatDateTime(s.createdAt)}</span></div>
                    </li>
                  );
                })}
              </ul>
            </AdminCard>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
