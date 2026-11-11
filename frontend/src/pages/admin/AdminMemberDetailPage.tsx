import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import { memberProfile as p, members, memberStatusTone } from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminRow } from '../../hooks/useAdminDetail';

/** Stitch screen: "회원 상세" */
export const AdminMemberDetailPage: React.FC = () => {
  const m = useAdminRow('memberId', members);
  const stats: readonly (readonly [string, string])[] = [['매너 점수', `${m.manner}점`], ['모집한 공고', p.stats[1][1]], ['참여한 파티', p.stats[2][1]], ['노쇼 횟수', `${m.sanctions}회`]];
  return (
    <AdminLayout back={{ to: ROUTES.adminMembers, label: '회원 목록으로 돌아가기' }} title="회원 상세">
      <div className="flex flex-col gap-6 max-w-[1000px]">
        <AdminCard title="회원 정보">
          <InfoGrid items={[['닉네임', m.nick], ['아이디', m.uid], ['가입 일시', m.joined], ['최근 접속', m.last], ['연락처', p.phone], ['회원 상태', <StatusBadge key="s" tone={memberStatusTone[m.status]}>{m.status}</StatusBadge>]]} />
        </AdminCard>
        <AdminCard title="게이머 프로필">
          <InfoGrid cols={1} items={[['선호 게임', p.games], ['주 포지션', p.position], ['플레이 스타일', <span key="t" className="flex flex-wrap gap-2">{p.styles.map((s) => <span key={s} className="px-2 py-0.5 rounded bg-night-base border border-night-borderLight text-xs">{s}</span>)}</span>], ['활동 시간대', p.time], ['나이대', p.age]]} />
        </AdminCard>
        <AdminCard title="활동 현황">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(([k, v]) => <div key={k} className="rounded-xl border border-night-borderLight bg-night-base p-4"><div className="text-xs text-fog-muted">{k}</div><div className="text-2xl font-bold text-white mt-1">{v}</div></div>)}
          </div>
          <div className="mt-5 pt-4 border-t border-night-borderLight flex flex-wrap gap-6 text-sm text-indigo-300">
            <Link to={ROUTES.adminPosts} className="hover:text-indigo-200">이 회원의 공고 보기</Link>
            <Link to={ROUTES.adminReports} className="hover:text-indigo-200">이 회원에 대한 신고 보기</Link>
          </div>
        </AdminCard>
        <AdminCard title="제재 이력">
          <div className="overflow-x-auto rounded-xl border border-night-borderLight">
            <table className="w-full text-sm">
              <thead className="bg-night-base/70 text-xs text-fog-muted"><tr>{['일시', '제재 내용', '기간', '사유', '관련 신고'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-night-borderLight">
                {p.history.map((h) => (
                  <tr key={h.at}>
                    <td className="px-4 py-3 text-xs">{h.at}</td>
                    <td className={`px-4 py-3 font-semibold ${h.action === '경고' ? 'text-amber-300' : 'text-rose-300'}`}>{h.action}</td>
                    <td className="px-4 py-3">{h.period}</td>
                    <td className="px-4 py-3">{h.reason}</td>
                    <td className="px-4 py-3"><Link to={paths.adminReportDetail(h.report)} className="text-indigo-300">신고 상세</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
};

export default AdminMemberDetailPage;
