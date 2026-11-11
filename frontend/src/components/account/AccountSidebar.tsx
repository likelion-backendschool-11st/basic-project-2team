import React from 'react';
import { Link } from 'react-router-dom';
import { accountNav, accountNotes, accountProfile, type AccountNavItem } from '../../data/accountData';

interface AccountSidebarProps {
  readonly active: AccountNavItem['id'];
}

const noteTone = {
  brand: { box: 'border-night-borderLight', icon: 'text-mercury-light', title: 'text-fog-headline' },
  danger: { box: 'border-roseAccent/30', icon: 'text-roseAccent', title: 'text-rose-300' },
} as const;

/** Left column of the account screens: profile mini card, section links and a context note. */
export const AccountSidebar: React.FC<AccountSidebarProps> = ({ active }) => {
  const note = accountNotes[active];
  const tone = noteTone[note.tone];
  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
      <div className="bg-night-surface border border-night-borderLight rounded-3xl p-5 shadow-card-subtle">
        <div className="flex flex-col items-center gap-2 pb-5 border-b border-night-borderLight">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-2 border-mercury bg-night-base flex items-center justify-center text-3xl font-bold text-mercury-light">
              {accountProfile.initial}
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-night-card border border-night-borderLight flex items-center justify-center text-fog-sub text-[11px]">
              <i className="fa-solid fa-camera" />
            </span>
          </div>
          <div className="text-base font-bold text-white">{accountProfile.nickname}</div>
          <div className="text-xs text-fog-muted font-mono">{accountProfile.handle}</div>
        </div>
        <nav aria-label="계정 관리" className="pt-4 flex flex-col gap-1.5">
          {accountNav.map((item) => {
            const on = item.id === active;
            const color = on
              ? item.danger
                ? 'bg-roseAccent/15 border-roseAccent/40 text-rose-300'
                : 'bg-mercury text-white shadow-glow-mercury border-transparent'
              : item.danger
                ? 'text-rose-300 hover:bg-roseAccent/10 border-transparent'
                : 'text-fog-sub hover:text-white hover:bg-white/5 border-transparent';
            return (
              <Link key={item.id} to={item.to} className={`flex items-center justify-between px-3.5 py-3 text-sm font-semibold rounded-xl border transition-all ${color}`}>
                <span className="flex items-center gap-2.5">
                  <i className={`fa-solid ${item.icon} w-4 text-center text-sm`} />
                  {item.label}
                </span>
                <i className="fa-solid fa-chevron-right text-[10px] opacity-60" />
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={`bg-night-surface border rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-fog-sub ${tone.box}`}>
        <i className={`fa-solid ${note.icon} mt-0.5 ${tone.icon}`} />
        <div>
          {note.title && <div className={`font-bold mb-1 ${tone.title}`}>{note.title}</div>}
          {note.body}
        </div>
      </div>
    </aside>
  );
};

export default AccountSidebar;
