import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { listHistory, type HistoryKind } from '../../api/adminApi';
import { adminText, describeAction, formatDateTime, historyKindLabel, historyKindOptions, historyLink, historyTone } from '../../data/adminData';
import { useAdminList } from '../../hooks/useAdminList';

const initial = { q: '', kind: '', from: '', to: '' };
const toQuery = (f: typeof initial) => ({ ...f, kind: f.kind as HistoryKind | '' });

/** 처리 내용 강조 색: 삭제·정지는 빨강, 경고는 노랑 */
const actionColor = (text: string) => (/삭제|정지/.test(text) ? 'text-rose-300' : text.startsWith('경고') ? 'text-amber-300' : '');

/** Stitch screen: "처리 이력" (read-only audit log) */
export const AdminHistoryPage: React.FC = () => {
  const l = useAdminList(listHistory, initial, toQuery);
  return (
    <AdminLayout
      title="처리 이력"
      badge={<span className="text-[11px] font-normal px-2.5 py-1 rounded-full border border-night-borderLight bg-night-card text-fog-sub">감사 로그 보안 준수</span>}
      description="관리자가 처리한 신고, 삭제, 제재, 정보 조회 내역을 확인합니다. 이력은 수정하거나 삭제할 수 없습니다."
    >
      <AdminFilterPanel onSearch={l.apply} onReset={l.reset}>
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="처리자, 대상, 사유" /></FilterField>
        <SelectField label="처리 구분" value={l.draft.kind} options={historyKindOptions} onChange={(v) => l.set('kind', v)} />
        <FilterField label="처리 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="처리 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="처리 이력 목록"
        list={l}
        columns={[
          { header: '번호', cell: (h) => <span className="text-fog-muted">{h.id}</span> },
          { header: '처리 일시', cell: (h) => <span className="font-mono text-xs">{formatDateTime(h.createdAt)}</span> },
          { header: '처리 구분', cell: (h) => (h.kind ? <StatusBadge tone={historyTone[h.kind]}>{historyKindLabel[h.kind]}</StatusBadge> : adminText.none) },
          { header: '처리 내용', cell: (h) => { const text = describeAction(h); return <span className={actionColor(text)}>{text}</span>; } },
          { header: '대상', cell: (h) => <b className="text-white">{h.detail?.targetLabel ?? adminText.none}</b> },
          { header: '사유', cell: (h) => <span className="text-fog-sub">{h.detail?.reason ?? adminText.none}</span> },
          { header: '처리자', cell: (h) => <span className="text-fog-sub whitespace-nowrap">{h.adminName}</span> },
          { header: '바로가기', cell: (h) => { const link = historyLink(h); return link ? <Link to={link.to} className="text-fog-headline hover:text-white whitespace-nowrap">{link.label} <i className="fa-solid fa-chevron-right text-[9px]" /></Link> : adminText.none; } },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminHistoryPage;
