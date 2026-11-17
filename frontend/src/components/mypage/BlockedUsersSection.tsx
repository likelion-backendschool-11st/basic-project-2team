import React from 'react';
import type { BlockedUser } from '../../data/myPageData';
import { blocksText } from '../../data/myPageData';
import BlockedUserCard from './BlockedUserCard';

interface BlockedUsersSectionProps {
  readonly users: readonly BlockedUser[];
  readonly loading: boolean;
  readonly onRemove: (user: BlockedUser) => void;
}

export const BlockedUsersSection: React.FC<BlockedUsersSectionProps> = ({ users, loading, onRemove }) => (
  <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm flex flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-night-borderLight">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <i className="fa-solid fa-ban text-sm text-roseAccent" />
        {blocksText.title}
      </h3>
      <span className="text-xs px-2 py-0.5 rounded-full bg-night-card text-slate-300 font-semibold border border-night-borderLight">
        {users.length}
        {blocksText.countSuffix}
      </span>
      <span className="text-[11px] text-fog-muted sm:ml-auto">{blocksText.note}</span>
    </div>
    {!loading && users.length === 0 ? (
      <p className="py-6 text-center text-sm text-slate-500">{blocksText.empty}</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((u) => (
          <BlockedUserCard key={u.id} user={u} onRemove={onRemove} />
        ))}
      </div>
    )}
  </div>
);

export default BlockedUsersSection;
