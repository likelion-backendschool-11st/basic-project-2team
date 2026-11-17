import React from 'react';
import { Link } from 'react-router-dom';
import type { BlockedUser } from '../../data/myPageData';
import { blocksText } from '../../data/myPageData';
import { paths } from '../../data/routes';

interface BlockedUserCardProps {
  readonly user: BlockedUser;
  readonly onRemove: (user: BlockedUser) => void;
}

export const BlockedUserCard: React.FC<BlockedUserCardProps> = ({ user, onRemove }) => (
  <div className="bg-night-card border border-night-borderLight rounded-xl p-3.5 flex flex-col justify-between hover:border-roseAccent/40 transition-all group">
    <Link to={paths.memberProfile(user.id)} className="flex items-center space-x-3" aria-label={`${user.name} ${blocksText.viewProfile}`}>
      {user.avatarUrl ? (
        <img
          alt={`${user.name}${blocksText.avatarAltSuffix}`}
          src={user.avatarUrl}
          className="w-11 h-11 rounded-xl object-cover ring-1 ring-night-borderLight opacity-70 group-hover:opacity-100"
        />
      ) : (
        <div
          aria-hidden
          className="w-11 h-11 rounded-xl bg-night-hover ring-1 ring-night-borderLight flex items-center justify-center text-base font-bold text-slate-400"
        >
          {user.name.slice(0, 1)}
        </div>
      )}
      <div className="overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate text-slate-200">{user.name}</span>
          <span className="text-[10px] px-1 rounded text-slate-400 bg-white/5">
            {blocksText.levelPrefix}
            {user.level}
          </span>
        </div>
        <div className="text-[11px] truncate mt-0.5 text-slate-500">
          {blocksText.blockedDatePrefix}
          {user.blockedDate}
        </div>
      </div>
    </Link>
    <div className="mt-3 pt-2.5 border-t border-night-borderLight/60 flex justify-end">
      <button
        type="button"
        onClick={() => onRemove(user)}
        className="px-2 py-1 text-[11px] font-semibold rounded bg-night-hover/50 hover:bg-roseAccent/15 hover:text-roseAccent text-slate-300 transition-colors"
      >
        {blocksText.remove}
      </button>
    </div>
  </div>
);

export default BlockedUserCard;
