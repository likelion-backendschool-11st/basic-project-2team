import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminLoadState from '../../components/admin/AdminLoadState';
import ReasonField from '../../components/admin/ReasonField';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Toast from '../../components/ui/Toast';
import { getReport } from '../../api/adminApi';
import {
  adminText,
  decisions,
  displayName,
  formatDateTime,
  memberStatusLabel,
  memberStatusTone,
  MEMO_MAX_LENGTH,
  reportActionLabel,
  reportDetailText as t,
  reportStatusLabel,
  reportStatusTone,
  reportTypeLabel,
  sanctionPeriod,
  sanctionTypeLabel,
  suspendPeriods,
} from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminId, useAdminNavigate, useAdminResource } from '../../hooks/useAdminDetail';
import { canDeleteContent, useReportDecision } from '../../hooks/useReportDecision';

const box = 'rounded-xl border border-night-borderLight bg-night-base';

/** Stitch screen: "신고 상세" — review the report, pick a decision, submit. */
export const AdminReportDetailPage: React.FC = () => {
  const id = useAdminId('reportId');
  const { data: report, error, loading, reload } = useAdminResource(id, getReport);
  const form = useReportDecision(id, reload);
  const go = useAdminNavigate();
  const back = { to: ROUTES.adminReports, label: t.back };

  if (!report) {
    return (
      <AdminLayout back={back} title={t.title}>
        <AdminLoadState loading={loading} error={error} onRetry={reload} />
      </AdminLayout>
    );
  }

  const closed = report.status === 'DONE' || report.status === 'REJECTED';
  const evidence = report.comment?.content ?? report.post?.title ?? null;

  return (
    <AdminLayout
      back={back}
      title={t.title}
      badge={<StatusBadge tone={reportStatusTone[report.status]}>{report.status === 'PENDING' ? t.pendingBadge : reportStatusLabel[report.status]}</StatusBadge>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <AdminCard title={t.info}>
            <InfoGrid items={[
              ['신고 번호', `#${report.id}`],
              ['접수 일시', formatDateTime(report.createdAt)],
              ['신고 유형', reportTypeLabel[report.type]],
              ['처리 상태', reportStatusLabel[report.status]],
              ['신고자', `${displayName(report.reporter.nickname)}${report.reporter.userId ? ` (${report.reporter.userId})` : ''}`],
              ['신고 사유', report.reason],
            ]} />
            <div className="mt-5 text-xs text-fog-muted mb-2">{t.description}</div>
            <p className={`${box} p-4 text-sm leading-7 text-fog-headline whitespace-pre-wrap`}>{report.detail ?? t.noDescription}</p>
          </AdminCard>
          <AdminCard title={t.target}>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className={`${box} p-4`}><div className="text-xs text-fog-muted">피신고자 닉네임</div><div className="text-lg font-bold text-white mt-1">{displayName(report.target.nickname)}</div></div>
              <div className={`${box} p-4`}><div className="text-xs text-fog-muted">매너 온도</div><div className="text-lg font-bold text-white mt-1">{report.target.mannerTemp.toFixed(1)}℃</div></div>
              <div className={`${box} p-4`}><div className="text-xs text-fog-muted">회원 상태</div><div className="mt-2"><StatusBadge tone={memberStatusTone[report.target.status]}>{memberStatusLabel[report.target.status]}</StatusBadge></div></div>
            </div>
            <div className="text-xs text-fog-muted mt-5 mb-2">{t.pastSanctions}</div>
            {report.sanctions.length === 0 ? <p className="text-xs text-fog-sub">{t.noSanctions}</p> : (
              <ul className="text-xs text-fog-sub space-y-1">
                {report.sanctions.map((s) => <li key={s.id}>● {sanctionTypeLabel[s.type]} {sanctionPeriod(s.type, s.startsAt, s.endsAt)} · {s.reason} ({formatDateTime(s.createdAt)}, {s.adminName})</li>)}
              </ul>
            )}
            <Link to={paths.adminMemberDetail(String(report.target.id))} className="block text-right text-xs text-indigo-300 mt-4">{t.toMember}</Link>
          </AdminCard>
          <AdminCard title="증빙 자료">
            <div className="text-xs text-fog-muted mb-2">{t.evidence}</div>
            <div className={`${box} p-4 text-sm ${evidence ? 'text-white' : 'text-fog-muted'} whitespace-pre-wrap`}>{evidence ?? t.evidenceNone}</div>
            {report.post && <Link to={paths.adminPostDetail(String(report.post.id))} className="block text-right text-xs text-indigo-300 mt-4">{t.toPost}</Link>}
          </AdminCard>
        </div>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
          <AdminCard title={t.decision} aside={<span className="text-[11px] px-2 py-1 rounded bg-night-card text-fog-sub">운영 조치 권한</span>}>
            {closed ? (
              <div className="text-sm space-y-2">
                <p className="text-fog-sub">{t.closed}</p>
                <InfoGrid cols={1} items={[
                  ['처리 결과', report.action ? reportActionLabel[report.action] : reportStatusLabel[report.status]],
                  ['처리자', report.handledBy ?? adminText.none],
                  ['처리 일시', formatDateTime(report.handledAt)],
                  ['처리 사유', report.memo ?? adminText.none],
                ]} />
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-fog-sub mb-2">처리 결과 <span className="text-rose-300">*</span></div>
                <div className="flex flex-col gap-2">
                  {decisions.map((d) => {
                    const disabled = d.contentOnly === true && !canDeleteContent(report);
                    const active = form.decision === d.id;
                    return (
                      <label key={d.id} className={`flex items-start gap-3 rounded-xl border p-3 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${active ? 'border-mercury bg-mercury/10' : 'border-night-borderLight hover:border-night-hover'}`}>
                        <input type="radio" name="decision" className="sr-only" disabled={disabled} checked={active} onChange={() => form.setDecision(d.id)} />
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${active ? 'border-white bg-white' : 'border-night-borderLight'}`} />
                        <span><span className="text-sm font-semibold text-white">{d.title}{d.recommended && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-night-card text-fog-sub">추천 조치</span>}</span><span className="block text-[11px] text-fog-muted mt-0.5">{d.desc}</span></span>
                      </label>
                    );
                  })}
                </div>
                <label className="block mt-5 text-xs font-semibold text-fog-sub">{t.period} <span className="font-normal text-fog-muted">(이용 정지 선택 시 활성)</span>
                  <select disabled={form.decision !== 'suspend'} value={form.days} onChange={(e) => form.setDays(Number(e.target.value))} className={`${box} mt-2 w-full h-11 px-3 text-sm disabled:opacity-40`}>{suspendPeriods.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}</select>
                </label>
                <div className="mt-4"><ReasonField label={t.memo} value={form.memo} onChange={form.changeMemo} maxLength={MEMO_MAX_LENGTH} error={form.error} /></div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  {report.status === 'PENDING' && <button type="button" disabled={form.busy} onClick={form.markInProgress} className="h-11 px-4 rounded-xl border border-night-borderLight text-sm text-fog-sub hover:text-white disabled:opacity-40">{t.markInProgress}</button>}
                  <button type="button" onClick={go.toReports} className="h-11 px-5 rounded-xl border border-night-borderLight text-sm text-fog-sub hover:text-white">{t.cancel}</button>
                  <button type="button" disabled={form.busy} onClick={form.submit} className="h-11 px-6 rounded-xl bg-mercury text-sm font-bold text-white shadow-lg shadow-mercury/30 hover:bg-mercury-light disabled:opacity-60"><i className="fa-solid fa-gavel mr-2" />{t.submit}</button>
                </div>
              </>
            )}
          </AdminCard>
        </aside>
      </div>
      <ConfirmDialog isOpen={form.confirm.isOpen} title={t.confirmTitle} description={t.confirmDescription(form.selected.title)} confirmLabel={form.busy ? adminText.loading : t.submit} cancelLabel={t.cancel} icon="fa-gavel" tone="brand" onConfirm={form.confirmDecision} onCancel={form.confirm.close} />
      <Toast message={form.toast.message} />
    </AdminLayout>
  );
};

export default AdminReportDetailPage;
