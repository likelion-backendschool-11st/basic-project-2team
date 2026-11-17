import React from 'react';
import type { RecentPlayer } from '../../data/myPageData';
import { recentPlayersText } from '../../data/myPageData';
import RecentPlayerCard from './RecentPlayerCard';

interface RecentPlayersSectionProps {
  readonly players: readonly RecentPlayer[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly onInvite: (player: RecentPlayer) => void;
}

export const RecentPlayersSection: React.FC<RecentPlayersSectionProps> = ({ players, loading, error, onInvite }) => {
  const t = recentPlayersText;
  let body: React.ReactNode;
  if (loading) body = <p className="py-6 text-center text-sm text-slate-500">{t.loading}</p>;
  else if (error) body = <p className="py-6 text-center text-sm text-slate-500">{error}</p>;
  else if (players.length === 0) body = <p className="py-6 text-center text-sm text-slate-500">{t.empty}</p>;
  else {
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {players.map((p) => (
          <RecentPlayerCard key={p.id} player={p} onInvite={onInvite} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-night-borderLight">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-user-group text-sm text-mercury-light" />
          {t.title}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-night-card text-slate-300 font-semibold border border-night-borderLight">
          {players.length}
          {t.countSuffix}
        </span>
        <span className="text-[11px] text-slate-500 basis-full sm:basis-auto sm:ml-auto">{t.hint}</span>
      </div>
      {body}
    </div>
  );
};

export default RecentPlayersSection;
