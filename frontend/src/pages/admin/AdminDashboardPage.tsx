import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminText, dashboardStats, recentSanctions, reportPath, reports, reportStatusTone } from '../../data/adminData';
import { ROUTES } from '../../data/routes';

const pill = 'px-4 py-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-xs text-indigo-200 hover:bg-indigo-500/20 whitespace-nowrap';

/** Stitch screen: "대시보드" */
export const AdminDashboardPage: React.FC = () => (
  <AdminLayout title="대시보드" description="관리자 계정으로 로그인하면 마이페이지 자리에 이 화면이 표시됩니다.">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {dashboardStats.map((s) => (
        <div key={s.label} className="rounded-3xl border border-night-borderLight bg-night-surface p-6">
          <div className="text-sm text-fog-sub">{s.label}</div>
          <div className="mt-3 text-5xl font-bold text-indigo-400">{s.value}<span className="text-xl text-fog-headline ml-1">건</span></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-6 items-start">
      <AdminCard title="최근 신고 목록" aside={<Link to={ROUTES.adminReports} className={pill}>신고 관리로 이동 →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-fog-muted border-b border-night-borderLight"><tr>{['접수 일시', '신고 유형', '신고 대상', '상태', '처리'].map((h) => <th key={h} className="py-3 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-night-borderLight">
              {reports.slice(0, 4).map((r) => (
                <tr key={r.id}>
                  <td className="py-4 font-mono text-xs">{r.at}</td>
                  <td className="py-4 font-semibold text-white">{r.reason.slice(0, 9)}</td>
                  <td className="py-4">{r.target}</td>
                  <td className="py-4"><StatusBadge tone={reportStatusTone[r.status]}>{r.status}</StatusBadge></td>
                  <td className="py-4"><Link to={reportPath(r)} className="text-indigo-300 hover:text-indigo-200">{adminText.detail}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <AdminCard title="최근 제재 내역">
        <Link to={ROUTES.adminHistory} className={`${pill} inline-block mb-4`}>처리 이력으로 이동 →</Link>
        <ul className="divide-y divide-night-borderLight">
          {recentSanctions.map((s) => (
            <li key={s.who} className="py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">{s.who}<StatusBadge tone={s.tone}>{s.badge}</StatusBadge></div>
              <div className="flex justify-between gap-3 text-xs text-fog-sub mt-1.5"><span>{s.reason}</span><span className="text-fog-muted">{s.time}</span></div>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  </AdminLayout>
);

export default AdminDashboardPage;
