import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminLoadState from '../../components/admin/AdminLoadState';
import ReasonField from '../../components/admin/ReasonField';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { getPost } from '../../api/adminApi';
import {
  adminText,
  describeAction,
  displayName,
  formatDateTime,
  postStatusLabel,
  postStatusTone,
  postText,
  REASON_MAX_LENGTH,
  reportStatusLabel,
  reportStatusTone,
} from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminId, useAdminNavigate, useAdminResource } from '../../hooks/useAdminDetail';
import { usePostDelete } from '../../hooks/usePostDelete';

const box = 'rounded-xl border border-night-borderLight bg-night-base';

/** Stitch screen: "공고 상세" (admin) — inspect and delete with a required reason. */
export const AdminPostDetailPage: React.FC = () => {
  const id = useAdminId('postId');
  const { data: post, error, loading, reload } = useAdminResource(id, getPost);
  const form = usePostDelete(id, reload);
  const go = useAdminNavigate();
  const back = { to: ROUTES.adminPosts, label: '공고 목록으로 돌아가기' };

  if (!post) {
    return (
      <AdminLayout back={back} title="공고 상세">
        <AdminLoadState loading={loading} error={error} onRetry={reload} />
      </AdminLayout>
    );
  }

  const deleted = post.status === 'DELETED';

  return (
    <AdminLayout back={back} title="공고 상세">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <AdminCard title={<>공고 정보 <StatusBadge tone={postStatusTone[post.status]}>{postStatusLabel[post.status]}</StatusBadge></>} aside={<span className="text-xs text-fog-muted">조회수 {post.views} · 댓글 {post.commentCount}</span>}>
            <InfoGrid items={[
              ['공고 번호', post.id],
              ['등록 일시', formatDateTime(post.createdAt)],
              ['게임 · 유형', `${post.game} · ${post.content ?? post.partyType}`],
              ['출발 일시', post.schedule ? formatDateTime(post.schedule) : postText.scheduleTbd],
              ['모집 현황', `${post.current} / ${post.max}명`],
              ['음성 채팅', post.voiceRequired ? '필수' : '선택'],
              ['파티 이름', post.partyName ?? adminText.none],
              ['플레이 스타일', post.playStyle ?? adminText.none],
            ]} />
            <div className="mt-5 text-sm"><div className="text-xs text-fog-muted mb-1">공고 제목</div><div className="font-bold text-white">{post.title}</div></div>
            {post.requiredSpec && <><div className="mt-5 text-xs text-fog-muted mb-2">요구 스펙</div><p className={`${box} p-4 text-sm`}>{post.requiredSpec}</p></>}
            <div className="mt-5 text-xs text-fog-muted mb-2">공고 본문</div><p className={`${box} p-4 text-sm leading-7 whitespace-pre-wrap`}>{post.body}</p>
            {deleted && (
              <div className="mt-5 rounded-xl border border-roseAccent/40 bg-roseAccent/10 p-4 text-sm">
                <InfoGrid cols={1} items={[['삭제 일시', formatDateTime(post.deletedAt)], ['삭제 처리자', post.deletedBy ?? adminText.none], ['삭제 사유', post.deleteReason ?? adminText.none]]} />
              </div>
            )}
          </AdminCard>
          <AdminCard title="작성자 정보" aside={<span className="text-xs text-fog-muted">아이디: {post.author.userId ?? adminText.none}</span>}>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                ['닉네임', displayName(post.author.nickname)],
                ['매너 온도', `${post.author.mannerTemp.toFixed(1)}℃`],
                ['기존 제재 이력', post.author.sanctionCount > 0 ? `${post.author.sanctionCount}회` : '없음 (클린 유저)'],
              ].map(([k, v]) => <div key={k} className={`${box} p-4`}><div className="text-xs text-fog-muted">{k}</div><div className="font-bold text-white mt-1">{v}</div></div>)}
            </div>
            <Link to={paths.adminMemberDetail(String(post.author.id))} className="block text-right text-xs text-indigo-300 mt-4">회원 상세로 이동 →</Link>
          </AdminCard>
          <AdminCard title={<>이 공고에 접수된 신고 <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-night-card text-fog-sub">총 {post.reports.length}건</span></>}>
            {post.reports.length === 0 ? <p className="text-sm text-fog-muted">{adminText.empty}</p> : (
              <table className="w-full text-sm">
                <thead className="text-xs text-fog-muted border-b border-night-borderLight"><tr><th className="py-2 text-left">접수 일시</th><th className="text-left">신고 사유</th><th className="text-left">신고자</th><th className="text-left">상태</th><th className="text-left">처리</th></tr></thead>
                <tbody className="divide-y divide-night-borderLight">
                  {post.reports.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 font-mono text-xs">{formatDateTime(r.createdAt)}</td>
                      <td>{r.reason}</td>
                      <td>{displayName(r.reporter)}</td>
                      <td><StatusBadge tone={reportStatusTone[r.status]}>{reportStatusLabel[r.status]}</StatusBadge></td>
                      <td><Link to={paths.adminReportDetail(String(r.id))} className="text-indigo-300">신고 상세</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
        </div>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
          <AdminCard title="공고 처리">
            <ReasonField label={postText.reasonLabel} value={form.reason} onChange={form.changeReason} maxLength={REASON_MAX_LENGTH} placeholder={postText.reasonPlaceholder} error={form.error} />
            <label className="mt-4 flex items-center gap-2 text-xs text-fog-sub"><input type="checkbox" checked={form.reviewSanction} onChange={(e) => form.setReviewSanction(e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />작성자 제재 검토 (신고 처리 화면으로 이동)</label>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={go.toPosts} className="h-11 rounded-xl border border-night-borderLight bg-night-card text-sm hover:bg-white/10">취소</button>
              <button type="button" onClick={form.submit} disabled={deleted || form.busy} className="h-11 rounded-xl bg-roseAccent text-sm font-bold text-white disabled:opacity-40 disabled:pointer-events-none">공고 삭제</button>
            </div>
            <p className="text-[11px] leading-5 text-fog-muted mt-4">공고 삭제를 누르면 확인 팝업이 표시되고, 확인 후 작성자에게 사유와 함께 알림이 전달됩니다. 삭제된 공고는 사용자 화면에서 보이지 않습니다.</p>
          </AdminCard>
          <AdminCard title="처리 이력">
            {post.logs.length === 0 ? <p className="text-xs text-fog-muted">{adminText.empty}</p> : (
              <ul className="divide-y divide-night-borderLight text-xs">
                {post.logs.map((l) => (
                  <li key={l.id} className="py-3">
                    <div className="flex justify-between gap-2 text-white font-semibold"><span>{l.adminName} · {describeAction(l)}</span></div>
                    {l.detail?.reason && <div className="text-fog-muted mt-1">사유: {l.detail.reason}</div>}
                    <div className="font-mono text-fog-muted mt-1">{formatDateTime(l.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </aside>
      </div>
      <ConfirmDialog isOpen={form.confirm.isOpen} title={postText.deleteTitle} description={postText.deleteDescription} confirmLabel={form.busy ? adminText.loading : '공고 삭제'} cancelLabel="취소" icon="fa-trash-can" onConfirm={() => void form.confirmDelete()} onCancel={form.confirm.close} />
      <Toast message={form.toast.message} />
    </AdminLayout>
  );
};

export default AdminPostDetailPage;
