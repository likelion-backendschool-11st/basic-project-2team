import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import ReasonField from '../../components/admin/ReasonField';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { deletePost, listPosts, type PostStatus } from '../../api/adminApi';
import { adminText, displayName, formatDateTime, postStatusLabel, postStatusOptions, postStatusTone, postText, REASON_MAX_LENGTH } from '../../data/adminData';
import { paths } from '../../data/routes';
import { useAdminBulkAction } from '../../hooks/useAdminBulkAction';
import { useAdminList, useSelection } from '../../hooks/useAdminList';
import { useGameOptions } from '../../hooks/useGameOptions';

const initial = { q: '', game: '', status: '', reported: false, from: '', to: '' };
const toQuery = (f: typeof initial) => ({ ...f, status: f.status as PostStatus | '', reported: f.reported || undefined });

/** Stitch screen: "공고 관리" */
export const AdminPostsPage: React.FC = () => {
  const l = useAdminList(listPosts, initial, toQuery);
  const sel = useSelection();
  const games = useGameOptions();
  const bulk = useAdminBulkAction(() => {
    sel.clear();
    l.reload();
  });
  // 이미 삭제된 공고는 다시 삭제할 수 없으므로 제외
  const targets = l.visible.filter((p) => sel.selected.has(p.id) && p.status !== 'DELETED').map((p) => p.id);

  return (
    <AdminLayout title="공고 관리" description="등록된 파티 모집 공고를 조회하고, 허위·불량 공고를 안전하게 삭제 및 조치합니다.">
      <AdminFilterPanel
        onSearch={l.apply}
        onReset={l.reset}
        footer={<label className="flex items-center gap-2 text-sm text-fog-sub"><input type="checkbox" checked={l.draft.reported} onChange={(e) => l.set('reported', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />신고된 공고만 보기</label>}
      >
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="공고 제목, 작성자 닉네임" /></FilterField>
        <SelectField label="게임" value={l.draft.game} options={games} onChange={(v) => l.set('game', v)} />
        <SelectField label="모집 상태" value={l.draft.status} options={postStatusOptions} onChange={(v) => l.set('status', v)} />
        <span />
        <FilterField label="등록 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="등록 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="공고 목록"
        list={l}
        selection={sel}
        rowClass={(p) => (p.status === 'DELETED' ? 'opacity-60' : '')}
        actions={<button type="button" disabled={targets.length === 0} onClick={bulk.dialog.open} className="h-9 px-3 rounded-lg border border-night-borderLight text-xs font-semibold text-rose-300 hover:bg-roseAccent/10 disabled:opacity-40 disabled:pointer-events-none"><i className="fa-regular fa-trash-can mr-1.5" />{postText.bulkDelete} {targets.length > 0 && `(${targets.length})`}</button>}
        columns={[
          { header: '번호', cell: (p) => <span className="text-fog-muted font-mono">{p.id}</span> },
          { header: '등록 일시', cell: (p) => <span className="font-mono text-xs">{formatDateTime(p.createdAt)}</span> },
          { header: '게임', cell: (p) => p.game },
          { header: '유형', cell: (p) => <span className="text-fog-sub">{p.content ?? p.partyType}</span> },
          { header: '공고 제목', cell: (p) => <span className={`font-semibold text-white ${p.status === 'DELETED' ? 'line-through' : ''}`}>{p.title}</span> },
          { header: '작성자', cell: (p) => displayName(p.author.nickname) },
          { header: '모집 현황', cell: (p) => <span className="px-2 py-0.5 rounded bg-night-base font-mono text-xs">{p.current} / {p.max}</span> },
          { header: '상태', cell: (p) => <StatusBadge tone={postStatusTone[p.status]}>{postStatusLabel[p.status]}</StatusBadge> },
          { header: '신고', cell: (p) => <span className={p.reportCount ? 'font-bold text-amber-300' : 'text-fog-muted'}>{p.reportCount}건</span> },
          { header: '상세', cell: (p) => <Link to={paths.adminPostDetail(String(p.id))} className="text-indigo-300 hover:text-indigo-200 whitespace-nowrap">{adminText.detail}</Link> },
        ]}
      />
      <ConfirmDialog
        isOpen={bulk.dialog.isOpen}
        title={postText.bulkConfirmTitle}
        description={postText.bulkConfirmDescription(targets.length)}
        confirmLabel={bulk.busy ? adminText.loading : '삭제'}
        cancelLabel="취소"
        icon="fa-trash-can"
        onConfirm={() => { if (!bulk.busy) void bulk.run(targets, deletePost, postText.deleted, postText.reasonRequired); }}
        onCancel={bulk.dialog.close}
      >
        <ReasonField label={postText.reasonLabel} value={bulk.reason} onChange={bulk.changeReason} maxLength={REASON_MAX_LENGTH} placeholder={postText.reasonPlaceholder} error={bulk.error} rows={3} />
      </ConfirmDialog>
      <Toast message={bulk.toast.message} />
    </AdminLayout>
  );
};

export default AdminPostsPage;
