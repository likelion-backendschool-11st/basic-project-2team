import React from 'react';
import type { FavoriteUser } from '../../data/myPageData';
import { favoritesText } from '../../data/myPageData';
import { presenceDotStyles, presenceTextStyles } from './mypageStyles';

interface FavoriteUserCardProps {
  readonly user: FavoriteUser;
  readonly onAction?: (id: string) => void;
}

export const FavoriteUserCard: React.FC<FavoriteUserCardProps> = ({ user, onAction }) => {
  const offline = user.presence === 'offline';
  return (
    <div className="bg-night-card border border-night-borderLight rounded-xl p-3.5 flex flex-col justify-between hover:border-mercury/50 transition-all group">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img
            alt={`${user.name}${favoritesText.avatarAltSuffix}`}
            src={user.avatarUrl}
            className={`w-11 h-11 rounded-xl object-cover ring-1 ring-night-borderLight ${
              offline ? 'opacity-60 group-hover:opacity-100 transition-opacity' : 'group-hover:ring-mercury'
            }`}
          />
          <span
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-night-card ${presenceDotStyles[user.presence]}`}
            title={favoritesText.presenceTitles[user.presence]}
          />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm truncate ${offline ? 'text-slate-400' : 'text-slate-200'}`}>{user.name}</span>
            <span className={`text-[10px] px-1 rounded ${offline ? 'text-slate-400 bg-night-hover/50' : 'text-amber-400 bg-amber-400/10'}`}>
              {favoritesText.levelPrefix}
              {user.level}
            </span>
          </div>
          <div className={`text-[11px] truncate mt-0.5 ${offline ? 'text-slate-500' : 'text-slate-400'}`}>{user.detail}</div>
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-night-borderLight/60 flex items-center justify-between">
        <span className={`text-[11px] font-medium ${presenceTextStyles[user.presence]}`}>{user.presenceLabel}</span>
        <button
          type="button"
          onClick={() => onAction?.(user.id)}
          className={
            user.action === 'invite'
              ? 'px-2 py-1 text-[11px] font-semibold rounded bg-mercury/20 hover:bg-mercury text-mercury-light hover:text-white transition-colors'
              : 'px-2 py-1 text-[11px] font-semibold rounded bg-night-hover/50 hover:bg-night-hover text-slate-300 transition-colors'
          }
        >
          {favoritesText.actions[user.action]}
        </button>
      </div>
    </div>
  );
};

export default FavoriteUserCard;
