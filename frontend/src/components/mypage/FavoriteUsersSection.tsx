import React from 'react';
import { Link } from 'react-router-dom';
import type { FavoriteUser } from '../../data/myPageData';
import { favoritesText } from '../../data/myPageData';
import FavoriteUserCard from './FavoriteUserCard';

interface FavoriteUsersSectionProps {
  readonly users: readonly FavoriteUser[];
}

export const FavoriteUsersSection: React.FC<FavoriteUsersSectionProps> = ({ users }) => (
  <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm flex flex-col gap-4">
    <div className="flex items-center justify-between pb-3 border-b border-night-borderLight">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-star text-sm text-amber-400" />
          {favoritesText.title}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-night-card text-slate-300 font-semibold border border-night-borderLight">
          {users.length}
          {favoritesText.countSuffix}
        </span>
      </div>
      <Link to={favoritesText.viewAllTo} className="text-xs font-semibold text-mercury-light hover:underline flex items-center gap-0.5">
        {favoritesText.viewAll}
        <i className="fa-solid fa-chevron-right text-[10px] ml-0.5" />
      </Link>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {users.map((u) => (
        <FavoriteUserCard key={u.id} user={u} />
      ))}
    </div>
  </div>
);

export default FavoriteUsersSection;
