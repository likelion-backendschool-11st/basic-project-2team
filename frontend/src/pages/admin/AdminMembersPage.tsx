import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminText, members, memberPath, memberStatuses, memberStatusTone, type Member, inRange } from '../../data/adminData';
import { useAdminList } from '../../hooks/useAdminList';

const initial = { q: '', status: '', risky: false, from: '', to: '' };
const match = (m: Member, f: typeof initial) =>
  (!f.q || `${m.nick}${m.uid}`.includes(f.q)) && (!f.status || m.status === f.status) && (!f.risky || m.reports >= 2) && inRange(m.joined, f.from, f.to);

const mannerColor = (n: number) => (n >= 80 ? 'text-emerald-300' : n >= 60 ? 'text-amber-300' : n >= 40 ? 'text-indigo-300' : 'text-rose-300');

/** Stitch screen: "회원 관리" */
export const AdminMembersPage: React.FC = () => {
  const l = useAdminList(members, initial, match);
  return (
    <AdminLayout title="회원 관리" description="회원을 조회하고 제재·정지 이력을 확인하며 이용 제한을 처리합니다.">
      <AdminFilterPanel
        onSearch={l.apply}
        onReset={l.reset}
        footer={<label className="flex items-center gap-2 text-sm text-fog-sub"><input type="checkbox" checked={l.draft.risky} onChange={(e) => l.set('risky', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />신고가 누적된 회원만 보기</label>}
      >
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="닉네임, 아이디" /></FilterField>
        <SelectField label="회원 상태" value={l.draft.status} options={memberStatuses} onChange={(v) => l.set('status', v)} />
        <FilterField label="가입 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="가입 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="회원 목록"
        unit="명"
        list={l}
        rowClass={(m) => (m.status === '탈퇴' ? 'opacity-60' : '')}
        columns={[
          { header: '번호', cell: (m) => <span className="text-fog-muted">{m.id}</span> },
          { header: '닉네임', cell: (m) => <span className={`font-semibold text-white ${m.status === '영구 정지' ? 'line-through' : ''}`}>{m.nick}</span> },
          { header: '아이디', cell: (m) => <span className="text-fog-sub">{m.uid}</span> },
          { header: '가입 일시', cell: (m) => <span className="font-mono text-xs">{m.joined}</span> },
          { header: '최근 접속', cell: (m) => <span className="font-mono text-xs">{m.last}</span> },
          { header: '매너 점수', cell: (m) => <b className={mannerColor(m.manner)}>{m.manner}점</b> },
          { header: '누적 신고', cell: (m) => <span className={m.reports >= 2 ? 'font-bold text-amber-300' : 'text-fog-muted'}>{m.reports}건</span> },
          { header: '제재', cell: (m) => <span className={m.sanctions ? 'font-bold text-rose-300' : 'text-fog-muted'}>{m.sanctions}회</span> },
          { header: '상태', cell: (m) => <StatusBadge tone={memberStatusTone[m.status]}>{m.status}</StatusBadge> },
          { header: '관리', cell: (m) => <Link to={memberPath(m)} className="text-indigo-300 hover:text-indigo-200 whitespace-nowrap">{adminText.detail}</Link> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminMembersPage;
