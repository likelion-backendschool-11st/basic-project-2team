import React from 'react';
import { Link } from 'react-router-dom';
import type { RecoveryTab } from '../../data/authData';

interface RecoveryTabsProps {
  readonly tabs: readonly RecoveryTab[];
  readonly activeId: RecoveryTab['id'];
}

/** 아이디 찾기 | 비밀번호 찾기 tab switcher (route-based). */
export const RecoveryTabs: React.FC<RecoveryTabsProps> = ({ tabs, activeId }) => (
  <nav aria-label="계정 찾기 탭" className="flex items-center border-b border-night-borderLight mb-6 text-sm">
    {tabs.map((tab) => {
      const active = tab.id === activeId;
      return (
        <Link
          aria-current={active ? 'page' : undefined}
          className={`flex-1 pb-3 -mb-px flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            active
              ? 'font-semibold text-mercury-light border-mercury'
              : 'font-medium text-fog-sub hover:text-fog-headline border-transparent'
          }`}
          key={tab.id}
          to={tab.to}
        >
          <i className={`${tab.icon} text-xs`} />
          <span>{tab.label}</span>
        </Link>
      );
    })}
  </nav>
);

export default RecoveryTabs;
