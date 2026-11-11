import React from 'react';
import { Link } from 'react-router-dom';
import type { LoggedInUser } from '../../data/userData';
import { userMenuText } from '../../data/userData';
import { useUserMenu } from '../../hooks/useUserMenu';

interface UserHeaderSlotProps {
  readonly user: LoggedInUser;
}

/** Logged-in replacement for the header's login/signup pills (pass as AppLayout `headerRightSlot`). */
export const UserHeaderSlot: React.FC<UserHeaderSlotProps> = ({ user }) => {
  const { onLogout } = useUserMenu();
  return (
    <div className="flex items-center gap-3">
      <Link
        to={userMenuText.profileLink}
        className="flex items-center gap-2.5 bg-night-surface border border-night-borderLight hover:border-mercury/50 rounded-full py-1 pl-1 pr-3.5 transition-all group"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-mercury to-indigo-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-mercury/30">
            {user.initial}
          </div>
          {user.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emeraldAccent border-2 border-night-surface" />
          )}
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white group-hover:text-mercury-light transition-colors">{user.nickname}</span>
            <span className="text-[9px] px-1 rounded bg-amberAccent/20 text-amberAccent font-bold">
              {userMenuText.levelPrefix}
              {user.level}
            </span>
          </div>
          <span className="text-[10px] text-fog-muted">
            {userMenuText.mannerPrefix}
            {user.mannerShort}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="px-3.5 py-1.5 text-xs font-semibold text-fog-sub hover:text-white bg-night-surface hover:bg-white/10 border border-night-borderLight rounded-full transition-all duration-150"
      >
        {userMenuText.logout}
      </button>
    </div>
  );
};

export default UserHeaderSlot;
