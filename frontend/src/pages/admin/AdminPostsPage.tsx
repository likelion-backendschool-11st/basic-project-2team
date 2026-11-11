import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { adminPosts, adminText, postGames, postPath, postStatuses, postStatusTone, type AdminPost, inRange } from '../../data/adminData';
import { useAdminList, useSelection } from '../../hooks/useAdminList';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../hooks/useToast';

const initial = { q: '', game: '', status: '', reported: false, from: '', to: '' };
const match = (p: AdminPost, f: typeof initial) =>
  (!f.q || `${p.title}${p.author}`.includes(f.q)) && (!f.game || p.game === f.game) && (!f.status || p.status === f.status) && (!f.reported || p.reports > 0) && inRange(p.at, f.from, f.to);

/** Stitch screen: "공고 관리" */
export const AdminPostsPage: React.FC = () => {
  const [rows, setRows] = useState<readonly AdminPost[]>(adminPosts);
  const l = useAdminList(rows, initial, match);
  const sel = useSelection();
  const confirm = useModal(false);
  const toast = useToast();

  const remove = () => {
    setRows((r) => r.map((p) => (sel.selected.has(p.id) ? { ...p, status: '삭제됨' as const } : p)));
    toast.show(`${sel.selected.size}건의 공고를 삭제 처리했습니다.`);
    sel.clear();
    confirm.close();
  };

  return (
    <AdminLayout title="공고 관리" description="등록된 파티 모집 공고를 조회하고, 허위·불량 공고를 안전하게 삭제 및 조치합니다.">
      <AdminFilterPanel
        onSearch={l.apply}
        onReset={l.reset}
        footer={<label className="flex items-center gap-2 text-sm text-fog-sub"><input type="checkbox" checked={l.draft.reported} onChange={(e) => l.set('reported', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />신고된 공고만 보기</label>}
      >
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="공고 제목, 작성자 닉네임" /></FilterField>
        <SelectField label="게임" value={l.draft.game} options={postGames} onChange={(v) => l.set('game', v)} />
        <SelectField label="모집 상태" value={l.draft.status} options={postStatuses} onChange={(v) => l.set('status', v)} />
        <span />
        <FilterField label="등록 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="등록 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="공고 목록"
        list={l}
        selection={sel}
        rowClass={(p) => (p.status === '삭제됨' ? 'opacity-60' : '')}
        actions={<button type="button" disabled={sel.selected.size === 0} onClick={confirm.open} className="h-9 px-3 rounded-lg border border-night-borderLight text-xs font-semibold text-rose-300 hover:bg-roseAccent/10 disabled:opacity-40 disabled:pointer-events-none"><i className="fa-regular fa-trash-can mr-1.5" />선택 공고 삭제 {sel.selected.size > 0 && `(${sel.selected.size})`}</button>}
        columns={[
          { header: '번호', cell: (p) => <span className="text-fog-muted font-mono">{p.id}</span> },
          { header: '등록 일시', cell: (p) => <span className="font-mono text-xs">{p.at}</span> },
          { header: '게임', cell: (p) => p.game },
          { header: '유형', cell: (p) => <span className="text-fog-sub">{p.type}</span> },
          { header: '공고 제목', cell: (p) => <span className={`font-semibold text-white ${p.status === '삭제됨' ? 'line-through' : ''}`}>{p.title}</span> },
          { header: '작성자', cell: (p) => p.author },
          { header: '모집 현황', cell: (p) => <span className="px-2 py-0.5 rounded bg-night-base font-mono text-xs">{p.cur} / {p.max}</span> },
          { header: '상태', cell: (p) => <StatusBadge tone={postStatusTone[p.status]}>{p.status}</StatusBadge> },
          { header: '신고', cell: (p) => <span className={p.reports ? 'font-bold text-amber-300' : 'text-fog-muted'}>{p.reports}건</span> },
          { header: '상세', cell: (p) => <Link to={postPath(p)} className="text-indigo-300 hover:text-indigo-200 whitespace-nowrap">{adminText.detail}</Link> },
        ]}
      />
      <ConfirmDialog isOpen={confirm.isOpen} title="선택한 공고를 삭제할까요?" description={`${sel.selected.size}건의 공고가 삭제 처리되며 작성자에게 알림이 전송됩니다.`} confirmLabel="삭제" cancelLabel="취소" icon="fa-trash-can" onConfirm={remove} onCancel={confirm.close} />
      <Toast message={toast.message} />
    </AdminLayout>
  );
};

export default AdminPostsPage;
