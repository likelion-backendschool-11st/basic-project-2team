import React from 'react';
import type { MannerLeader } from '../../data/homeData';
import { avatarStyles, rankBadgeStyles, tagStyles } from '../../data/accentStyles';

interface MannerLeaderCardProps {
  readonly leader: MannerLeader;
}

export const MannerLeaderCard: React.FC<MannerLeaderCardProps> = ({ leader }) => (
  <div
    className={`p-3 rounded-xl border border-white/[0.04] flex items-center justify-between hover:border-mercury/40 transition-colors ${
      leader.rank === 1 ? 'bg-night-card' : 'bg-night-card/70'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-white text-sm ${avatarStyles[leader.accent]}`}>
          {leader.initial}
        </div>
        <span
          className={`absolute -bottom-1 -right-1 w-4 h-4 text-[9px] font-black rounded-full flex items-center justify-center shadow ${rankBadgeStyles[leader.rank]}`}
        >
          {leader.rank}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-fog-headline">{leader.name}</span>
          <span className={`text-[10px] px-1.5 rounded font-medium ${tagStyles[leader.accent]}`}>{leader.game}</span>
        </div>
        <p className="text-[11px] text-fog-muted">{leader.comment}</p>
      </div>
    </div>
    <div className="text-right">
      <span className="text-xs font-bold text-emeraldAccent flex items-center gap-1 justify-end">
        <i className="fa-solid fa-heart text-[10px]" /> {leader.temperature}
      </span>
      <span className="text-[10px] text-fog-muted">{leader.recommends}</span>
    </div>
  </div>
);

export default MannerLeaderCard;
