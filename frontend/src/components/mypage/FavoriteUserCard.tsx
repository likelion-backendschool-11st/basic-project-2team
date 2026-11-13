import React from 'react';
import type { FavoriteUser } from '../../data/myPageData';
import { favoritesText } from '../../data/myPageData';

interface FavoriteUserCardProps {
  readonly user: FavoriteUser;
  readonly onRemove: (user: FavoriteUser) => void;
}

export const FavoriteUserCard: React.FC<FavoriteUserCardProps> = ({ user, onRemove }) => (
  <div className="bg-night-card border border-night-borderLight rounded-xl p-3.5 flex flex-col justify-between hover:border-mercury/50 transition-all group">
    <div className="flex items-center space-x-3">
      {user.avatarUrl ? (
        <img
          alt={`${user.name}${favoritesText.avatarAltSuffix}`}
          src={user.avatarUrl}
          className="w-11 h-11 rounded-xl object-cover ring-1 ring-night-borderLight group-hover:ring-mercury"
        />
      ) : (
        <div
          aria-hidden
          className="w-11 h-11 rounded-xl bg-night-hover ring-1 ring-night-borderLight group-hover:ring-mercury flex items-center justify-center text-base font-bold text-mercury-light"
        >
          {user.name.slice(0, 1)}
        </div>
      )}
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate text-slate-200">{user.name}</span>
          <span className="text-[10px] px-1 rounded text-amber-400 bg-amber-400/10">
            {favoritesText.levelPrefix}
            {user.level}
          </span>
        </div>
        <div className="text-[11px] truncate mt-0.5 text-slate-400">{user.detail}</div>
      </div>
    </div>
    <div className="mt-3 pt-2.5 border-t border-night-borderLight/60 flex items-center justify-between">
      <span className="text-[11px] font-medium text-emerald-400">{user.manner}</span>
      <button
        type="button"
        onClick={() => onRemove(user)}
        className="px-2 py-1 text-[11px] font-semibold rounded bg-night-hover/50 hover:bg-night-hover text-slate-300 transition-colors"
      >
        {favoritesText.remove}
      </button>
    </div>
  </div>
);

export default FavoriteUserCard;
