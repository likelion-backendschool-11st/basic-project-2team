import React from 'react';
import { Link } from 'react-router-dom';
import AdminCard, { InfoGrid } from '../../components/admin/AdminCard';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminLoadState from '../../components/admin/AdminLoadState';
import StatusBadge from '../../components/admin/StatusBadge';
import { getMember } from '../../api/adminApi';
import { adminText, displayName, formatDateTime, formatPhone, memberStatusLabel, memberStatusTone, sanctionPeriod, sanctionTypeLabel } from '../../data/adminData';
import { paths, ROUTES } from '../../data/routes';
import { useAdminId, useAdminResource } from '../../hooks/useAdminDetail';

/** Stitch screen: "회원 상세" — 개인정보 조회라 서버가 조회 기록을 남깁니다. */
export const AdminMemberDetailPage: React.FC = () => {
  const id = useAdminId('memberId');
  const { data: m, error, loading, reload } = useAdminResource(id, getMember);
  const back = { to: ROUTES.adminMembers, label: '회원 목록으로 돌아가기' };

  if (!m) {
    return (
      <AdminLayout back={back} title="회원 상세">
        <AdminLoadState loading={loading} error={error} onRetry={reload} />
      </AdminLayout>
    );
  }

  const stats: readonly (readonly [string, string])[] = [
    ['매너 온도', `${m.mannerTemp.toFixed(1)}℃`],
    ['모집한 공고', `${m.stats.postCount}건`],
    ['참여한 파티', `${m.stats.partyCount}건`],
    ['노쇼 횟수', `${m.stats.noShowCount}회`],
  ];
  const mainGame = m.games.find((g) => g.isMain) ?? m.games[0];

  return (
    <AdminLayout back={back} title="회원 상세">
      <div className="flex flex-col gap-6 max-w-[1000px]">
        <AdminCard title="회원 정보">
          <InfoGrid items={[
            ['닉네임', displayName(m.nickname)],
            ['아이디', m.userId ?? adminText.none],
            ['이름', m.name ?? adminText.none],
            ['이메일', m.email ?? adminText.none],
            ['연락처', formatPhone(m.phone)],
            ['가입 일시', formatDateTime(m.joinedAt)],
            ['최근 접속', formatDateTime(m.lastLoginAt)],
            ['회원 상태', <StatusBadge key="s" tone={memberStatusTone[m.status]}>{memberStatusLabel[m.status]}</StatusBadge>],
            ...(m.status === 'SUSPENDED' ? [['정지 해제', formatDateTime(m.suspendedUntil)] as const] : []),
            ...(m.withdrawnAt ? [['탈퇴 일시', formatDateTime(m.withdrawnAt)] as const] : []),
          ]} />
        </AdminCard>
        <AdminCard title="게이머 프로필">
          <InfoGrid cols={1} items={[
            ['선호 게임', m.games.length > 0 ? m.games.map((g) => g.game).join(', ') : adminText.none],
            ['캐릭터', mainGame?.characterName ?? adminText.none],
            ['플레이 스타일', mainGame?.playStyle ? <span key="t" className="px-2 py-0.5 rounded bg-night-base border border-night-borderLight text-xs">{mainGame.playStyle}</span> : adminText.none],
            ['활동 시간대', mainGame?.playTimeSlot ?? adminText.none],
            ['나이대', m.ageRange ?? adminText.none],
            ['자기소개', m.bio ?? adminText.none],
            ['활동 레벨', `Lv.${m.level}`],
          ]} />
        </AdminCard>
        <AdminCard title="활동 현황">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map(([k, v]) => <div key={k} className="rounded-xl border border-night-borderLight bg-night-base p-4"><div className="text-xs text-fog-muted">{k}</div><div className="text-2xl font-bold text-white mt-1">{v}</div></div>)}
          </div>
          <div className="mt-5 pt-4 border-t border-night-borderLight flex flex-wrap gap-6 text-sm text-indigo-300">
            <span className="text-fog-sub">받은 신고 {m.stats.reportCount}건 · 받은 평가 {m.reviewCount}건</span>
            <Link to={ROUTES.adminPosts} className="hover:text-indigo-200">공고 관리로 이동</Link>
            <Link to={ROUTES.adminReports} className="hover:text-indigo-200">신고 관리로 이동</Link>
          </div>
        </AdminCard>
        <AdminCard title="제재 이력">
          {m.sanctions.length === 0 ? <p className="text-sm text-fog-muted">제재 이력이 없습니다.</p> : (
            <div className="overflow-x-auto rounded-xl border border-night-borderLight">
              <table className="w-full text-sm">
                <thead className="bg-night-base/70 text-xs text-fog-muted"><tr>{['일시', '제재 내용', '기간', '사유', '처리자', '관련 신고'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-night-borderLight">
                  {m.sanctions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-xs">{formatDateTime(s.createdAt)}</td>
                      <td className={`px-4 py-3 font-semibold ${s.type === 'WARNING' ? 'text-amber-300' : 'text-rose-300'}`}>{sanctionTypeLabel[s.type]}</td>
                      <td className="px-4 py-3">{sanctionPeriod(s.type, s.startsAt, s.endsAt)}</td>
                      <td className="px-4 py-3">{s.reason}</td>
                      <td className="px-4 py-3 text-fog-sub">{s.adminName}</td>
                      <td className="px-4 py-3">{s.reportId ? <Link to={paths.adminReportDetail(String(s.reportId))} className="text-indigo-300">신고 상세</Link> : adminText.none}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
};

export default AdminMemberDetailPage;
