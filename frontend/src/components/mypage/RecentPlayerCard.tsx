import React from 'react';
import { Link } from 'react-router-dom';
import type { RecentPlayer } from '../../data/myPageData';
import { recentPlayersText } from '../../data/myPageData';
import { paths } from '../../data/routes';
import Avatar from '../ui/Avatar';
import GameBadge from './GameBadge';

interface RecentPlayerCardProps {
  readonly player: RecentPlayer;
  readonly onInvite: (player: RecentPlayer) => void;
}

export const RecentPlayerCard: React.FC<RecentPlayerCardProps> = ({ player, onInvite }) => (
  <div className="bg-night-card border border-night-borderLight rounded-xl p-3.5 flex flex-col gap-3 hover:border-mercury/50 transition-all">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar
        url={player.avatarUrl}
        name={player.name}
        className="w-11 h-11 shrink-0 rounded-xl bg-night-hover ring-1 ring-night-borderLight flex items-center justify-center text-base font-bold text-mercury-light"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate text-slate-200">{player.name}</span>
          <span className="shrink-0 text-[10px] px-1 rounded text-amber-400 bg-amber-400/10">
            {recentPlayersText.levelPrefix}
            {player.level}
          </span>
        </div>
        <div className="text-[11px] mt-0.5 font-medium text-emerald-400">{player.manner}</div>
      </div>
    </div>
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <GameBadge label={player.game} accent={player.accent} />
        <span className="text-[11px] text-slate-400 truncate">{player.meta}</span>
      </div>
      <p className="text-[11px] text-slate-500 truncate" title={player.lastParty}>
        {recentPlayersText.lastPartyPrefix}
        {player.lastParty}
      </p>
    </div>
    <div className="pt-2.5 border-t border-night-borderLight/60 grid grid-cols-2 gap-2">
      <Link
        to={paths.memberProfile(player.id)}
        className="px-2 py-1.5 text-[11px] font-semibold rounded text-center bg-night-hover/50 hover:bg-night-hover text-slate-300 transition-colors"
      >
        {recentPlayersText.viewProfile}
      </Link>
      <button
        type="button"
        onClick={() => onInvite(player)}
        className="px-2 py-1.5 text-[11px] font-bold rounded bg-mercury hover:bg-mercury-light text-white transition-colors"
      >
        <i className="fa-solid fa-paper-plane mr-1" aria-hidden />
        {recentPlayersText.invite}
      </button>
    </div>
  </div>
);

export default RecentPlayerCard;
