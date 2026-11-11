import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { history, historyKinds, historyTone, type HistoryRow, inRange } from '../../data/adminData';
import { useAdminList } from '../../hooks/useAdminList';

const initial = { q: '', kind: '', from: '', to: '' };
const match = (h: HistoryRow, f: typeof initial) =>
  (!f.q || `${h.target}${h.reason}${h.action}`.includes(f.q)) && (!f.kind || h.kind === f.kind) && inRange(h.at, f.from, f.to);

/** Stitch screen: "처리 이력" (read-only audit log) */
export const AdminHistoryPage: React.FC = () => {
  const l = useAdminList(history, initial, match, 7);
  return (
    <AdminLayout
      title="처리 이력"
      badge={<span className="text-[11px] font-normal px-2.5 py-1 rounded-full border border-night-borderLight bg-night-card text-fog-sub">감사 로그 보안 준수</span>}
      description="관리자가 처리한 신고, 삭제, 제재, 정보 조회 내역을 확인합니다. 이력은 수정하거나 삭제할 수 없습니다."
    >
      <AdminFilterPanel onSearch={l.apply} onReset={l.reset}>
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="처리자, 대상 닉네임, 사유" /></FilterField>
        <SelectField label="처리 구분" value={l.draft.kind} options={historyKinds} onChange={(v) => l.set('kind', v)} />
        <FilterField label="처리 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="처리 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="처리 이력 목록"
        list={l}
        columns={[
          { header: '번호', cell: (h) => <span className="text-fog-muted">{h.id}</span> },
          { header: '처리 일시', cell: (h) => <span className="font-mono text-xs">{h.at}</span> },
          { header: '처리 구분', cell: (h) => <StatusBadge tone={historyTone[h.kind]}>{h.kind}</StatusBadge> },
          { header: '처리 내용', cell: (h) => <span className={h.kind === '공고 삭제' || h.action.includes('정지') ? 'text-rose-300' : h.action === '경고 조치' ? 'text-amber-300' : ''}>{h.action}</span> },
          { header: '대상', cell: (h) => <b className="text-white">{h.target}</b> },
          { header: '사유', cell: (h) => <span className="text-fog-sub">{h.reason}</span> },
          { header: '바로가기', cell: (h) => <Link to={h.to} className="text-fog-headline hover:text-white whitespace-nowrap">{h.linkLabel} <i className="fa-solid fa-chevron-right text-[9px]" /></Link> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminHistoryPage;
