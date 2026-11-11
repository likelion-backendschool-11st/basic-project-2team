import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { adminPostBody as b, adminPosts, postStatusTone, reportPath, reports } from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminNavigate, useAdminRow } from '../../hooks/useAdminDetail';
import { useModal } from '../../hooks/useModal';

const MAX = 200;
const box = 'rounded-xl border border-night-borderLight bg-night-base';

/** Stitch screen: "공고 상세" (admin) — inspect and delete with a required reason. */
export const AdminPostDetailPage: React.FC = () => {
  const post = useAdminRow('postId', adminPosts);
  const go = useAdminNavigate();
  const [reason, setReason] = useState('');
  const [sanction, setSanction] = useState(false);
  const [error, setError] = useState(false);
  const confirm = useModal(false);
  const related = reports.filter((r) => r.type === '공고').slice(0, 2);

  const submit = () => (reason.trim() ? confirm.open() : setError(true));
  const done = () => (sanction ? go.toReports() : go.toPosts());

  return (
    <AdminLayout back={{ to: ROUTES.adminPosts, label: '공고 목록으로 돌아가기' }} title="공고 상세">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <AdminCard title={<>공고 정보 <StatusBadge tone={postStatusTone[post.status]}>{post.status}</StatusBadge></>} aside={<span className="text-xs text-fog-muted">고유 식별번호 {post.id}</span>}>
            <InfoGrid items={[['공고 번호', post.id], ['등록 일시', post.at], ['게임 · 유형', `${post.game} · ${post.type}`], ['출발 일시', b.start], ['모집 현황', `${post.cur} / ${post.max}명`], ['모집 상태', post.status]]} />
            <div className="mt-5 text-sm"><div className="text-xs text-fog-muted mb-1">공고 제목</div><div className="font-bold text-white">{post.title}</div></div>
            <div className="mt-5 text-xs text-fog-muted mb-2">요구 스펙</div><p className={`${box} p-4 text-sm`}>{b.spec}</p>
            <div className="mt-5 text-xs text-fog-muted mb-2">공고 본문</div><p className={`${box} p-4 text-sm leading-7`}>{b.body}</p>
          </AdminCard>
          <AdminCard title="작성자 정보" aside={<span className="text-xs text-fog-muted">UID: {b.uid}</span>}>
            <div className="grid sm:grid-cols-3 gap-3">
              {[['닉네임', post.author], ['매너 점수', `${b.manner} / 100점`], ['기존 제재 이력', '없음 (클린 유저)']].map(([k, v]) => <div key={k} className={`${box} p-4`}><div className="text-xs text-fog-muted">{k}</div><div className="font-bold text-white mt-1">{v}</div></div>)}
            </div>
            <Link to={paths.adminMemberDetail('1042')} className="block text-right text-xs text-indigo-300 mt-4">회원 상세로 이동 →</Link>
          </AdminCard>
          <AdminCard title={<>이 공고에 접수된 신고 <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-night-card text-fog-sub">총 {related.length}건</span></>}>
            <table className="w-full text-sm">
              <thead className="text-xs text-fog-muted border-b border-night-borderLight"><tr><th className="py-2 text-left">접수 일시</th><th className="text-left">신고 사유</th><th className="text-left">처리</th></tr></thead>
              <tbody className="divide-y divide-night-borderLight">{related.map((r) => <tr key={r.id}><td className="py-3 font-mono text-xs">{r.at}</td><td>{r.reason.slice(0, 14)}</td><td><Link to={reportPath(r)} className="text-indigo-300">신고 상세</Link></td></tr>)}</tbody>
            </table>
          </AdminCard>
        </div>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
          <AdminCard title="공고 처리">
            <label className="block text-xs font-semibold text-fog-sub"><span className="flex justify-between">삭제 사유 <span className="text-rose-300">(필수)</span><span className="font-normal text-fog-muted">{reason.length}/{MAX}</span></span>
              <textarea value={reason} maxLength={MAX} rows={4} placeholder="작성자에게 통지될 삭제 사유를 입력하세요" onChange={(e) => { setReason(e.target.value); setError(false); }} className={`${box} mt-2 w-full p-3 text-sm resize-none focus:border-mercury focus:ring-0`} />
            </label>
            {error && <p role="alert" className="text-xs text-rose-300 mt-1">삭제 사유를 입력해 주세요.</p>}
            <label className="mt-4 flex items-center gap-2 text-xs text-fog-sub"><input type="checkbox" checked={sanction} onChange={(e) => setSanction(e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />작성자 제재 검토 (신고 처리 화면으로 이동)</label>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={go.toPosts} className="h-11 rounded-xl border border-night-borderLight bg-night-card text-sm hover:bg-white/10">취소</button>
              <button type="button" onClick={submit} disabled={post.status === '삭제됨'} className="h-11 rounded-xl bg-roseAccent text-sm font-bold text-white disabled:opacity-40 disabled:pointer-events-none">공고 삭제</button>
            </div>
            <p className="text-[11px] leading-5 text-fog-muted mt-4">공고 삭제를 누르면 확인 팝업이 표시되고, 확인 후 작성자와 지원자에게 알림이 전달됩니다. 삭제된 공고는 사용자 화면에서 보이지 않습니다.</p>
          </AdminCard>
          <AdminCard title="처리 이력">
            <ul className="divide-y divide-night-borderLight text-xs">{b.logs.map((l) => <li key={l.who} className="py-3"><div className="flex justify-between gap-2 text-white font-semibold"><span>{l.who}</span><span className="text-fog-muted font-normal">{l.time}</span></div><div className="text-fog-muted mt-1">사유: {l.reason}</div><div className="font-mono text-fog-muted mt-1">{l.date}</div></li>)}</ul>
          </AdminCard>
        </aside>
      </div>
      <ConfirmDialog isOpen={confirm.isOpen} title="공고를 삭제할까요?" description="삭제하면 작성자와 지원자에게 알림이 전달되며, 사용자 화면에서 더 이상 보이지 않습니다." confirmLabel="공고 삭제" cancelLabel="취소" icon="fa-trash-can" onConfirm={done} onCancel={confirm.close} />
    </AdminLayout>
  );
};

export default AdminPostDetailPage;
