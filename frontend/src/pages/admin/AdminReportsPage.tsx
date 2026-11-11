import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminText, reportPath, reports, reportStatuses, reportStatusTone, reportTypes, type Report, inRange } from '../../data/adminData';
import { useAdminList } from '../../hooks/useAdminList';

const initial = { q: '', type: '', status: '', from: '', to: '' };
const match = (r: Report, f: typeof initial) =>
  (!f.q || `${r.target}${r.reporter}${r.reason}`.includes(f.q)) && (!f.type || r.type === f.type) && (!f.status || r.status === f.status) && inRange(r.at, f.from, f.to);

/** Stitch screen: "신고 관리" */
export const AdminReportsPage: React.FC = () => {
  const l = useAdminList(reports, initial, match);
  return (
    <AdminLayout title="신고 관리" description="접수된 유저, 노쇼, 공고, 댓글 신고를 조회하고 처리합니다.">
      <AdminFilterPanel onSearch={l.apply} onReset={l.reset}>
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="신고 대상 닉네임, 사유" /></FilterField>
        <SelectField label="신고 유형" value={l.draft.type} options={reportTypes} onChange={(v) => l.set('type', v)} />
        <SelectField label="처리 상태" value={l.draft.status} options={reportStatuses} onChange={(v) => l.set('status', v)} />
        <FilterField label="접수 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="접수 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="신고 목록"
        list={l}
        columns={[
          { header: '번호', cell: (r) => <span className="text-fog-muted">{r.id}</span> },
          { header: '접수 일시', cell: (r) => <span className="font-mono text-xs">{r.at}</span> },
          { header: '유형', cell: (r) => <span className="px-2 py-0.5 rounded bg-night-base text-xs whitespace-nowrap">{r.type}</span> },
          { header: '신고 사유', cell: (r) => <span className="font-semibold text-white">{r.reason}</span> },
          { header: '신고 대상', cell: (r) => r.target },
          { header: '신고자', cell: (r) => r.reporter },
          { header: '상태', cell: (r) => <StatusBadge tone={reportStatusTone[r.status]}>{r.status}</StatusBadge> },
          { header: '처리', cell: (r) => <Link to={reportPath(r)} className="text-indigo-300 hover:text-indigo-200 whitespace-nowrap">{adminText.detail}</Link> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminReportsPage;
