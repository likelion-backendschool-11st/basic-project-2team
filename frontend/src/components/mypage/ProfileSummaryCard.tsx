import React from 'react';
import { profileSummary } from '../../data/myPageData';
import ProfileStatsPanel from './ProfileStatsPanel';

interface ProfileSummaryCardProps {
  readonly profile: typeof profileSummary;
}

/** MyPage top card: avatar + level, profile fields, activity stats. */
export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile }) => {
  const [nicknameField, ...otherFields] = profile.fields;
  return (
    <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-mercury/10 rounded-full blur-3xl pointer-events-none" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-3 flex flex-col items-center sm:items-start lg:items-center">
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl overflow-hidden ring-2 ring-mercury/60 shadow-xl bg-night-card flex items-center justify-center">
              <img alt={profile.avatarAlt} className="w-full h-full object-cover" src={profile.avatarUrl} />
            </div>
            <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-mercury to-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow border-2 border-night-surface">
              {profile.levelLabel}
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-3 font-medium">{profile.avatarCaption}</span>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-center space-y-2.5">
          {nicknameField && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm font-medium w-24 shrink-0">{nicknameField.label}</span>
              <span className="text-white text-base font-bold flex items-center gap-1.5">
                {profile.nickname}
                <span className="text-xs px-2 py-0.5 rounded-full bg-mercury/20 text-mercury-light font-semibold border border-mercury/40">
                  {profile.positionBadge}
                </span>
              </span>
            </div>
          )}
          {otherFields.map((f, i) => (
            <div key={f.id} className={`flex gap-2 ${i === otherFields.length - 1 ? 'items-baseline' : 'items-center'}`}>
              <span className="text-slate-400 text-sm font-medium w-24 shrink-0">{f.label}</span>
              <span className={i === 0 ? 'text-slate-200 text-sm font-medium' : 'text-slate-300 text-sm'}>{f.value}</span>
            </div>
          ))}
          <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <i className="fa-regular fa-comment-dots text-sm text-mercury-light" />
            <span className="italic text-slate-300">{profile.intro}</span>
          </div>
        </div>

        <ProfileStatsPanel
          stats={profile.stats}
          rating={profile.rating}
          topTagsTitle={profile.topTagsTitle}
          topTagsCaption={profile.topTagsCaption}
          topTags={profile.topTags}
          rankSuffix={profile.rankSuffix}
        />
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
