import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { decisions, reportDetailText as t, reports, reportStatusTone, suspendPeriods } from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminNavigate, useAdminRow } from '../../hooks/useAdminDetail';
import { useModal } from '../../hooks/useModal';

const MAX = 500;
const box = 'rounded-xl border border-night-borderLight bg-night-base';

/** Stitch screen: "신고 상세" — review the report, pick a decision, submit. */
export const AdminReportDetailPage: React.FC = () => {
  const report = useAdminRow('reportId', reports);
  const go = useAdminNavigate();
  const [decision, setDecision] = useState<(typeof decisions)[number]['id']>('suspend');
  const [period, setPeriod] = useState<string>(suspendPeriods[2]);
  const [memo, setMemo] = useState('파티 채팅 내 모욕적인 비하 발언 및 서비스 이용 약관 14조 2항 위반으로 인한 서비스 7일 이용 정지 처분 안내');
  const [error, setError] = useState(false);
  const confirm = useModal(false);

  const submit = () => (memo.trim() ? confirm.open() : setError(true));

  return (
    <AdminLayout
      back={{ to: ROUTES.adminReports, label: '신고 목록으로 돌아가기' }}
      title="신고 상세"
      badge={<StatusBadge tone={reportStatusTone[report.status]}>{report.status === '접수' ? '접수 완료 (검토 대기)' : report.status}</StatusBadge>}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <AdminCard title="신고 정보" aside={<span className="text-xs text-fog-muted">우선순위: 긴급 (신고 다수)</span>}>
            <InfoGrid items={[['신고 번호', `#REP-20260331-0${report.id}`], ['접수 일시', `${report.at.replace(/\./g, '-')}:18`], ['신고 유형', report.type], ['처리 상태', report.status], ['신고자', `${report.reporter} (매너 92점)`], ['접수 채널', '인게임 오버레이 신고 모듈 v2.4']]} />
            <div className="mt-5 text-xs text-fog-muted mb-2">신고 사유 및 설명</div>
            <p className={`${box} p-4 text-sm leading-7 text-fog-headline`}>{t.description}</p>
          </AdminCard>
          <AdminCard title="신고 대상 정보">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className={`${box} p-4`}><div className="text-xs text-fog-muted">피신고자 닉네임</div><div className="text-lg font-bold text-white mt-1">{report.target}</div></div>
              <div className={`${box} p-4`}><div className="text-xs text-fog-muted">매너 지수</div><div className="text-lg font-bold text-white mt-1">34점 / 100점</div></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div><div className="text-xs text-fog-muted">누적 피신고 건수</div><b className="text-white">5건</b></div>
              <div><div className="text-xs text-fog-muted">기존 제재 조치 이력</div><ul className="text-xs text-fog-sub mt-1 space-y-0.5"><li>● 경고 1회 (2026-02-14)</li><li>● 3일 이용 정지 1회 (2026-03-02)</li></ul></div>
            </div>
            <Link to={paths.adminMemberDetail('1042')} className="block text-right text-xs text-indigo-300 mt-4">회원 상세 관리 기록으로 이동 →</Link>
          </AdminCard>
          <AdminCard title="증빙 자료">
            <div className="text-xs text-fog-muted mb-2">신고된 공고 또는 댓글 원문</div>
            <div className={`${box} p-4 space-y-2 font-mono text-xs`}>{t.evidence.map((e, i) => <p key={e} className={i === 3 ? 'text-white bg-white/5 rounded px-2 py-1' : 'text-fog-sub'}>{e}</p>)}</div>
            <div className="text-xs text-fog-muted mt-5 mb-2">파티 로그 · 채팅 기록 등 증빙</div>
            <div className={`${box} p-4 space-y-1 font-mono text-xs text-fog-sub`}>{t.log.map((l) => <p key={l}>{l}</p>)}</div>
          </AdminCard>
        </div>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
          <AdminCard title="신고 처리 결정" aside={<span className="text-[11px] px-2 py-1 rounded bg-night-card text-fog-sub">운영 조치 권한</span>}>
            <div className="text-xs font-semibold text-fog-sub mb-2">처리 결과 <span className="text-rose-300">*</span></div>
            <div className="flex flex-col gap-2">
              {decisions.map((d) => (
                <label key={d.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${decision === d.id ? 'border-mercury bg-mercury/10' : 'border-night-borderLight hover:border-night-hover'}`}>
                  <input type="radio" name="decision" className="sr-only" checked={decision === d.id} onChange={() => setDecision(d.id)} />
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${decision === d.id ? 'border-white bg-white' : 'border-night-borderLight'}`} />
                  <span><span className="text-sm font-semibold text-white">{d.title}{'recommended' in d && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-night-card text-fog-sub">추천 조치</span>}</span><span className="block text-[11px] text-fog-muted mt-0.5">{d.desc}</span></span>
                </label>
              ))}
            </div>
            <label className="block mt-5 text-xs font-semibold text-fog-sub">정지 기간 <span className="font-normal text-fog-muted">(이용 정지 선택 시 활성)</span>
              <select disabled={decision !== 'suspend'} value={period} onChange={(e) => setPeriod(e.target.value)} className={`${box} mt-2 w-full h-11 px-3 text-sm disabled:opacity-40`}>{suspendPeriods.map((p) => <option key={p}>{p}</option>)}</select>
            </label>
            <label className="block mt-4 text-xs font-semibold text-fog-sub">
              <span className="flex justify-between">처리 사유 <span className="font-normal text-fog-muted">{memo.length} / {MAX}자</span></span>
              <textarea value={memo} maxLength={MAX} rows={4} onChange={(e) => { setMemo(e.target.value); setError(false); }} className={`${box} mt-2 w-full p-3 text-sm resize-none focus:border-mercury focus:ring-0`} />
            </label>
            {error && <p role="alert" className="text-xs text-rose-300 mt-1">처리 사유를 입력해 주세요.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={go.toReports} className="h-11 px-5 rounded-xl border border-night-borderLight text-sm text-fog-sub hover:text-white">취소</button>
              <button type="button" onClick={submit} className="h-11 px-6 rounded-xl bg-mercury text-sm font-bold text-white shadow-lg shadow-mercury/30 hover:bg-mercury-light"><i className="fa-solid fa-gavel mr-2" />처리하기</button>
            </div>
          </AdminCard>
          <AdminCard title="처리 이력">
            <ul className="divide-y divide-night-borderLight text-xs">
              {t.past.map((p) => <li key={p.date} className="py-3"><div className="font-semibold text-white">{p.who}</div><div className="text-fog-muted mt-1 leading-5">사유: {p.reason} · {p.date}</div></li>)}
            </ul>
          </AdminCard>
        </aside>
      </div>
      <ConfirmDialog isOpen={confirm.isOpen} title="이 신고를 처리할까요?" description={`‘${decisions.find((d) => d.id === decision)?.title}’ 결과로 처리하고 처리 이력에 기록합니다. 기록은 수정할 수 없습니다.`} confirmLabel="처리하기" cancelLabel="취소" icon="fa-gavel" tone="brand" onConfirm={go.toHistory} onCancel={confirm.close} />
    </AdminLayout>
  );
};

export default AdminReportDetailPage;
