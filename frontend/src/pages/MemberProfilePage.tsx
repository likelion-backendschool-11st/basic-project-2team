import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toProfileSummary } from '../api/mypageApi';
import ReportDialog from '../components/comments/ReportDialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import MannerTempChart from '../components/mypage/MannerTempChart';
import MemberPostsSection from '../components/mypage/MemberPostsSection';
import ProfileSummaryCard from '../components/mypage/ProfileSummaryCard';
import LoggedInLayout from '../components/user/LoggedInLayout';
import Toast from '../components/ui/Toast';
import { memberProfileText, profileText } from '../data/myPageData';
import { styleChoices } from '../data/writeData';
import { useMemberProfile } from '../hooks/useMemberProfile';

const styleLabelOf = (style: string | null) => styleChoices.find((s) => s.id === style)?.label ?? null;

/** 다른 회원의 프로필 페이지 (/members/:memberId): 프로필 카드 + 게이머 프로필(게임별) + 즐겨찾기·차단 */
export const MemberProfilePage: React.FC = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { profile, error, favorited, blocked, pending, toggleFavorite, toggleBlock, blockDialog, report, reportDialog, reload, toast } = useMemberProfile(memberId);
  const summary = useMemo(() => (profile ? toProfileSummary(profile) : null), [profile]);

  return (
    <LoggedInLayout contained={false}>
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-fog-sub hover:text-white flex items-center gap-2">
            <i className="fa-solid fa-arrow-left" />
            {memberProfileText.back}
          </button>
          {profile && (
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reportDialog.open}
              className="h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 border border-night-borderLight text-fog-sub hover:text-roseAccent hover:bg-roseAccent/10 transition-colors"
            >
              <i className="fa-regular fa-flag" />
              {memberProfileText.report}
            </button>
            <button
              type="button"
              onClick={blocked ? () => void toggleBlock() : blockDialog.open}
              disabled={pending}
              aria-pressed={blocked}
              className={`h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-colors disabled:opacity-60 ${
                blocked ? 'bg-roseAccent/10 border-roseAccent/40 text-roseAccent' : 'border-night-borderLight text-fog-sub hover:text-roseAccent hover:bg-roseAccent/10'
              }`}
            >
              <i className="fa-solid fa-ban" />
              {blocked ? memberProfileText.blocked : memberProfileText.block}
            </button>
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              disabled={pending}
              aria-pressed={favorited}
              className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 border transition-colors disabled:opacity-60 ${
                favorited ? 'bg-mercury/15 border-mercury/40 text-mercury-light' : 'border-night-borderLight text-fog-sub hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`${favorited ? 'fa-solid' : 'fa-regular'} fa-star`} />
              {favorited ? memberProfileText.favorited : memberProfileText.favorite}
            </button>
            </div>
          )}
        </div>

        {summary && profile ? (
          <>
            <ProfileSummaryCard profile={summary} />
            <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-gamepad text-mercury-light" />
                {memberProfileText.gamesTitle}
              </h2>
              {profile.games.length === 0 ? (
                <p className="text-sm text-fog-muted">{memberProfileText.gamesEmpty}</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.games.map((g) => (
                    <li key={g.code} className="rounded-xl border border-night-borderLight bg-night-card/60 p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{g.name}</span>
                        {g.isMain && <span className="text-[10px] px-2 py-0.5 rounded-full bg-mercury/20 text-mercury-light font-semibold border border-mercury/40">{memberProfileText.mainBadge}</span>}
                      </div>
                      <p className="mt-1.5 text-xs text-fog-sub">{[styleLabelOf(g.playStyle), g.playTimeSlot].filter(Boolean).join(' / ') || profileText.noStyle}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <MannerTempChart memberId={profile.id} />
            <MemberPostsSection memberId={profile.id} />
          </>
        ) : (
          <div className="bg-night-surface border border-night-borderLight rounded-2xl p-10 text-center text-sm text-slate-400">
            {error ?? profileText.loading}
            {error && error !== memberProfileText.notFound && (
              <button type="button" onClick={reload} className="ml-3 text-mercury-light font-semibold hover:underline">
                {profileText.retry}
              </button>
            )}
          </div>
        )}
      </div>
      <ReportDialog isOpen={reportDialog.isOpen} title={memberProfileText.reportTitle} onConfirm={(reason, detail) => void report(reason, detail)} onClose={reportDialog.close} />
      <ConfirmDialog
        isOpen={blockDialog.isOpen}
        title={memberProfileText.blockDialog.title}
        description={memberProfileText.blockDialog.description}
        confirmLabel={memberProfileText.blockDialog.confirm}
        cancelLabel={memberProfileText.blockDialog.cancel}
        icon="fa-ban"
        onConfirm={() => void toggleBlock()}
        onCancel={blockDialog.close}
      />
      <Toast message={toast.message} />
    </LoggedInLayout>
  );
};

export default MemberProfilePage;
