import React from 'react';
import type { ProfileStat, TopTag } from '../../data/myPageData';
import TopTagChip from './TopTagChip';

interface ProfileStatsPanelProps {
  readonly stats: readonly ProfileStat[];
  readonly rating: {
    readonly label: string;
    readonly score: string;
    readonly note: string;
    readonly temperature: string;
  };
  readonly topTagsTitle: string;
  readonly topTagsCaption: string;
  readonly topTags: readonly TopTag[];
  readonly rankSuffix: string;
}

/** Right column of the profile card: post count, matched parties, rating + top tags. */
export const ProfileStatsPanel: React.FC<ProfileStatsPanelProps> = ({ stats, rating, topTagsTitle, topTagsCaption, topTags, rankSuffix }) => (
  <div className="lg:col-span-4 bg-night-card/60 border border-night-borderLight rounded-xl p-4 flex flex-col gap-3 justify-center">
    {stats.map((s) => (
      <div key={s.id} className="flex items-center justify-between pb-2 border-b border-night-borderLight/50">
        <span className="text-sm text-slate-400">{s.label}</span>
        <span className={`text-sm font-bold tracking-wide ${s.highlight ? 'text-mercury-light' : 'text-white'}`}>
          {s.value}
          <span className="text-xs text-slate-400 font-normal ml-0.5">{s.unit}</span>
        </span>
      </div>
    ))}
    <div className="flex items-center justify-between pb-2 border-b border-night-borderLight/50">
      <div className="flex flex-col">
        <span className="text-sm text-slate-400">{rating.label}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
            <i className="fa-solid fa-star text-[11px] text-amber-400" /> {rating.score}
          </span>
          <span className="text-[10px] text-slate-400">{rating.note}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-base font-extrabold text-emerald-400">{rating.temperature}</span>
        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <i className="fa-solid fa-temperature-half text-[11px]" />
        </div>
      </div>
    </div>
    <div className="pt-0.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
          <span className="w-1 h-3 bg-mercury rounded-full" />
          {topTagsTitle}
        </span>
        <span className="text-[10px] text-slate-400">{topTagsCaption}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topTags.map((t) => (
          <TopTagChip key={t.rank} tag={t} rankSuffix={rankSuffix} />
        ))}
      </div>
    </div>
  </div>
);

export default ProfileStatsPanel;
