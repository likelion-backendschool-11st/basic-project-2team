import React from 'react';
import { Link } from 'react-router-dom';
import AdminFilterPanel, { FilterField, SelectField, filterControl } from '../../components/admin/AdminFilterPanel';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminTable from '../../components/admin/AdminTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { listMembers, type MemberStatus } from '../../api/adminApi';
import { adminText, displayName, formatDateTime, memberStatusLabel, memberStatusOptions, memberStatusTone } from '../../data/adminData';
import { paths } from '../../data/routes';
import { useAdminList } from '../../hooks/useAdminList';

const initial = { q: '', status: '', reported: false, from: '', to: '' };
const toQuery = (f: typeof initial) => ({ ...f, status: f.status as MemberStatus | '', reported: f.reported || undefined });

/** 매너 온도 색 (기본 36.5) */
const mannerColor = (n: number) => (n >= 50 ? 'text-emerald-300' : n >= 36.5 ? 'text-amber-300' : n >= 25 ? 'text-indigo-300' : 'text-rose-300');

/** Stitch screen: "회원 관리" */
export const AdminMembersPage: React.FC = () => {
  const l = useAdminList(listMembers, initial, toQuery);
  return (
    <AdminLayout title="회원 관리" description="회원을 조회하고 제재·정지 이력을 확인하며 이용 제한을 처리합니다.">
      <AdminFilterPanel
        onSearch={l.apply}
        onReset={l.reset}
        footer={<label className="flex items-center gap-2 text-sm text-fog-sub"><input type="checkbox" checked={l.draft.reported} onChange={(e) => l.set('reported', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />신고된 회원만 보기</label>}
      >
        <FilterField label="검색어"><input className={filterControl} value={l.draft.q} onChange={(e) => l.set('q', e.target.value)} placeholder="닉네임, 아이디, 이메일" /></FilterField>
        <SelectField label="회원 상태" value={l.draft.status} options={memberStatusOptions} onChange={(v) => l.set('status', v)} />
        <FilterField label="가입 기간 (시작)"><input type="date" className={filterControl} value={l.draft.from} onChange={(e) => l.set('from', e.target.value)} /></FilterField>
        <FilterField label="가입 기간 (종료)"><input type="date" className={filterControl} value={l.draft.to} onChange={(e) => l.set('to', e.target.value)} /></FilterField>
      </AdminFilterPanel>
      <AdminTable
        title="회원 목록"
        unit="명"
        list={l}
        rowClass={(m) => (m.status === 'WITHDRAWN' ? 'opacity-60' : '')}
        columns={[
          { header: '번호', cell: (m) => <span className="text-fog-muted">{m.id}</span> },
          { header: '닉네임', cell: (m) => <span className={`font-semibold text-white ${m.status === 'BANNED' ? 'line-through' : ''}`}>{displayName(m.nickname)}</span> },
          { header: '아이디', cell: (m) => <span className="text-fog-sub">{m.userId ?? adminText.none}</span> },
          { header: '가입 일시', cell: (m) => <span className="font-mono text-xs">{formatDateTime(m.joinedAt)}</span> },
          { header: '최근 접속', cell: (m) => <span className="font-mono text-xs">{formatDateTime(m.lastLoginAt)}</span> },
          { header: '매너 온도', cell: (m) => <b className={mannerColor(m.mannerTemp)}>{m.mannerTemp.toFixed(1)}℃</b> },
          { header: '누적 신고', cell: (m) => <span className={m.reportCount >= 2 ? 'font-bold text-amber-300' : 'text-fog-muted'}>{m.reportCount}건</span> },
          { header: '제재', cell: (m) => <span className={m.sanctionCount ? 'font-bold text-rose-300' : 'text-fog-muted'}>{m.sanctionCount}회</span> },
          { header: '상태', cell: (m) => <StatusBadge tone={memberStatusTone[m.status]}>{memberStatusLabel[m.status]}</StatusBadge> },
          { header: '관리', cell: (m) => <Link to={paths.adminMemberDetail(String(m.id))} className="text-indigo-300 hover:text-indigo-200 whitespace-nowrap">{adminText.detail}</Link> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminMembersPage;
