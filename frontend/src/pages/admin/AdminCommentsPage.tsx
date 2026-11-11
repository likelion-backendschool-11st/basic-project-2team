import React, { useState } from 'react';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import Toast from '../../components/ui/Toast';
import { adminComments, commentStatuses, commentStatusTone, type AdminComment, type CommentStatus, inRange } from '../../data/adminData';
import { useAdminList, useSelection } from '../../hooks/useAdminList';
import { useToast } from '../../hooks/useToast';

const initial = { q: '', status: '', kind: '', reported: false, from: '', to: '' };
const match = (c: AdminComment, f: typeof initial) =>
  (!f.q || `${c.text}${c.author}${c.post}`.includes(f.q)) && (!f.status || c.status === f.status) &&
  (!f.kind || (f.kind === '비밀 댓글' ? !!c.secret : !c.secret)) && (!f.reported || c.status === '신고됨') && inRange(c.at, f.from, f.to);

/** Stitch screen: "댓글 관리" */
export const AdminCommentsPage: React.FC = () => {
  const [rows, setRows] = useState<readonly AdminComment[]>(adminComments);
  const l = useAdminList(rows, initial, match);
  const sel = useSelection();
  const toast = useToast();

  /** Hide / restore the checked comments (deleted ones are never touched). */
  const apply = (to: CommentStatus, label: string) => {
    setRows((r) => r.map((c) => (sel.selected.has(c.id) && c.status !== '삭제' ? { ...c, status: to } : c)));
    toast.show(`선택한 댓글을 ${label} 처리했습니다.`);
    sel.clear();
  };
  const btn = 'h-9 px-3 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none';
  const none = sel.selected.size === 0;

  return (
    <AdminLayout title="댓글 관리" description="공고에 달린 댓글과 대댓글을 조회하고, 신고된 댓글을 가리거나 복구합니다.">
      <AdminFilterPanel
        onSearch={l.apply}
        onReset={l.reset}
        footer={<label className="flex items-center gap-2 text-sm text-fog-sub"><input type="checkbox" checked={l.draft.reported} onChange={(e) => l.set('reported', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />신고된 댓글만 보기</label>}
      >
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="댓글 내용, 작성자 닉네임, 공고 제목" /></FilterField>
        <SelectField label="댓글 상태" value={l.draft.status} options={commentStatuses} onChange={(v) => l.set('status', v)} />
        <SelectField label="구분" value={l.draft.kind} options={['일반 댓글', '비밀 댓글']} onChange={(v) => l.set('kind', v)} />
        <span />
        <FilterField label="작성 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="작성 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="댓글 목록"
        list={l}
        selection={sel}
        rowClass={(c) => (c.status === '삭제' ? 'opacity-50' : '')}
        actions={
          <>
            <button type="button" disabled={none} onClick={() => apply('가림', '가림')} className={`${btn} border-roseAccent/50 text-rose-300 hover:bg-roseAccent/10`}>선택 댓글 가림</button>
            <button type="button" disabled={none} onClick={() => apply('정상', '복구')} className={`${btn} border-night-borderLight text-fog-headline hover:bg-white/10`}>선택 댓글 복구</button>
          </>
        }
        columns={[
          { header: '번호', cell: (c) => <span className="text-fog-muted">{c.id}</span> },
          { header: '작성 일시', cell: (c) => <span className="font-mono text-xs">{c.at}</span> },
          { header: '공고', cell: (c) => <span className="text-indigo-300 whitespace-nowrap">{c.post}</span> },
          { header: '작성자', cell: (c) => c.author },
          { header: '댓글 내용', cell: (c) => <span className={c.secret || c.status === '삭제' ? 'italic text-fog-muted' : 'text-white'}>{c.status === '가림' ? '관리자에 의해 가려진 댓글입니다.' : c.text}</span> },
          { header: '상태', cell: (c) => <StatusBadge tone={commentStatusTone[c.status]}>{c.status}</StatusBadge> },
        ]}
      />
      <Toast message={toast.message} />
    </AdminLayout>
  );
};

export default AdminCommentsPage;
