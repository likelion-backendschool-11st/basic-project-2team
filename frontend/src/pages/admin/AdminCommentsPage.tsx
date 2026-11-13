import React, { useState } from 'react';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import ReasonField from '../../components/admin/ReasonField';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { listComments, updateComment, type CommentStatus, type CommentUpdateStatus } from '../../api/adminApi';
import { adminText, commentKindOptions, commentStatusLabel, commentStatusOptions, commentStatusTone, commentText, displayName, formatDateTime, REASON_MAX_LENGTH } from '../../data/adminData';
import { useAdminBulkAction } from '../../hooks/useAdminBulkAction';
import { useAdminList, useSelection } from '../../hooks/useAdminList';

const initial = { q: '', status: '', kind: '', reported: false, from: '', to: '' };
const toQuery = ({ kind, reported, ...f }: typeof initial) => ({
  ...f,
  // "신고된 댓글만 보기" 는 REPORTED 상태 필터와 같습니다.
  status: (reported ? 'REPORTED' : f.status) as CommentStatus | '',
  secret: kind === '' ? undefined : kind === 'true',
});

/** 일괄 처리 종류: 가림(HIDDEN) · 복구(VISIBLE) */
const bulkActions = { hide: { to: 'HIDDEN', label: '가림' }, restore: { to: 'VISIBLE', label: '복구' } } as const satisfies Record<string, { to: CommentUpdateStatus; label: string }>;
type BulkKey = keyof typeof bulkActions;

/** 현재 상태 → 바꿀 상태로 갈 수 있는지. 삭제된 댓글과 이미 같은 상태인 댓글은 제외 */
const canChange = (status: CommentStatus, to: CommentUpdateStatus) =>
  status !== 'DELETED' && !(status === to || (status === 'REPORTED' && to === 'VISIBLE'));

/** Stitch screen: "댓글 관리" */
export const AdminCommentsPage: React.FC = () => {
  const l = useAdminList(listComments, initial, toQuery);
  const sel = useSelection();
  const [pending, setPending] = useState<BulkKey>('hide');
  const bulk = useAdminBulkAction(() => {
    sel.clear();
    l.reload();
  });
  const action = bulkActions[pending];
  const targetsFor = (key: BulkKey) => l.visible.filter((c) => sel.selected.has(c.id) && canChange(c.status, bulkActions[key].to)).map((c) => c.id);
  const targets = targetsFor(pending);

  const openBulk = (key: BulkKey) => {
    if (targetsFor(key).length === 0) {
      bulk.toast.show(commentText.nothing);
      return;
    }
    setPending(key);
    bulk.dialog.open();
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
        <SelectField label="댓글 상태" value={l.draft.status} options={commentStatusOptions} onChange={(v) => l.set('status', v)} />
        <SelectField label="구분" value={l.draft.kind} options={commentKindOptions} onChange={(v) => l.set('kind', v)} />
        <span />
        <FilterField label="작성 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="작성 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="댓글 목록"
        list={l}
        selection={sel}
        rowClass={(c) => (c.status === 'DELETED' ? 'opacity-50' : '')}
        actions={
          <>
            <button type="button" disabled={none} onClick={() => openBulk('hide')} className={`${btn} border-roseAccent/50 text-rose-300 hover:bg-roseAccent/10`}>{commentText.hide}</button>
            <button type="button" disabled={none} onClick={() => openBulk('restore')} className={`${btn} border-night-borderLight text-fog-headline hover:bg-white/10`}>{commentText.restore}</button>
          </>
        }
        columns={[
          { header: '번호', cell: (c) => <span className="text-fog-muted">{c.id}</span> },
          { header: '작성 일시', cell: (c) => <span className="font-mono text-xs">{formatDateTime(c.createdAt)}</span> },
          { header: '공고', cell: (c) => <span className="text-indigo-300 whitespace-nowrap">{c.post.title}</span> },
          { header: '작성자', cell: (c) => displayName(c.author.nickname) },
          // 관리자는 가린 댓글·비밀 댓글 본문도 확인할 수 있습니다.
          { header: '댓글 내용', cell: (c) => <span className={c.secret || c.status === 'DELETED' ? 'italic text-fog-muted' : 'text-white'}>{c.secret && <i className="fa-solid fa-lock text-[10px] mr-1.5" />}{c.text}{c.status === 'HIDDEN' && <span className="block text-[11px] not-italic text-amber-300/80">{commentText.hiddenText}</span>}</span> },
          { header: '상태', cell: (c) => <StatusBadge tone={commentStatusTone[c.status]}>{commentStatusLabel[c.status]}</StatusBadge> },
        ]}
      />
      <ConfirmDialog
        isOpen={bulk.dialog.isOpen}
        title={commentText.confirmTitle(action.label)}
        description={commentText.confirmDescription(targets.length)}
        confirmLabel={bulk.busy ? adminText.loading : action.label}
        cancelLabel="취소"
        icon={pending === 'hide' ? 'fa-eye-slash' : 'fa-rotate-left'}
        tone={pending === 'hide' ? 'danger' : 'brand'}
        onConfirm={() => {
          if (!bulk.busy) void bulk.run(targets, (id, reason) => updateComment(id, action.to, reason), (count) => commentText.done(action.label, count), commentText.reasonRequired);
        }}
        onCancel={bulk.dialog.close}
      >
        <ReasonField label={commentText.reasonLabel} value={bulk.reason} onChange={bulk.changeReason} maxLength={REASON_MAX_LENGTH} placeholder={commentText.reasonPlaceholder} error={bulk.error} rows={3} />
      </ConfirmDialog>
      <Toast message={bulk.toast.message} />
    </AdminLayout>
  );
};

export default AdminCommentsPage;
