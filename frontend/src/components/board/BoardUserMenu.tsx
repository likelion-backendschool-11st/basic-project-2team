import React from 'react';
import { Link } from 'react-router-dom';
import { currentUser } from '../../data/boardData';
import { ROUTES } from '../../data/routes';

interface BoardUserMenuProps {
  readonly user?: typeof currentUser;
}

/** Logged-in user pill + logout, passed into AppLayout's header right slot. */
export const BoardUserMenu: React.FC<BoardUserMenuProps> = ({ user = currentUser }) => (
  <div className="flex items-center gap-3 shrink-0">
    <Link
      to={ROUTES.myPage}
      className="flex items-center gap-2.5 bg-night-surface border border-night-border px-3 py-1.5 rounded-full hover:border-night-borderLight transition-colors"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-xs font-bold text-white shadow-inner">
        {user.initial}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-xs font-bold text-fog-headline">{user.name}</span>
          <span className="text-[9px] px-1.5 bg-mercury/30 text-indigo-300 rounded font-semibold border border-mercury/40">{user.level}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-medium">
          <i className="fa-solid fa-heart text-[8px]" />
          <span>{user.manner}</span>
        </div>
      </div>
    </Link>
    <Link
      to={ROUTES.home}
      className="px-3.5 py-1.5 rounded-full text-xs font-medium text-fog-sub bg-night-base hover:bg-night-surface hover:text-white border border-night-border transition-all"
    >
      {user.logout}
    </Link>
  </div>
);

export default BoardUserMenu;
