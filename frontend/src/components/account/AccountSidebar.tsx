import React from 'react';
import { Link } from 'react-router-dom';
import { accountNav, accountNotes, avatarText, type AccountNavItem } from '../../data/accountData';
import { useAccountProfile } from '../../hooks/useAccountProfile';

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
  const { profile, uploading, avatarError, fileInputRef, pickAvatar, onAvatarFileChange, resetAvatar } = useAccountProfile();
  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
      <div className="bg-night-surface border border-night-borderLight rounded-3xl p-5 shadow-card-subtle">
        <div className="flex flex-col items-center gap-2 pb-5 border-b border-night-borderLight">
          <div className="relative">
            <button
              type="button"
              onClick={pickAvatar}
              disabled={!profile || uploading}
              aria-label={avatarText.changeLabel}
              title={avatarText.changeLabel}
              className="group block w-20 h-20 rounded-2xl border-2 border-mercury bg-night-base overflow-hidden disabled:cursor-wait"
            >
              <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-mercury-light">
                {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : profile?.initial}
              </span>
              {uploading && (
                <span className="absolute inset-0 rounded-2xl bg-night-base/70 flex items-center justify-center text-mercury-light">
                  <i className="fa-solid fa-spinner fa-spin" />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={pickAvatar}
              disabled={!profile || uploading}
              aria-label={avatarText.changeLabel}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-night-card border border-night-borderLight flex items-center justify-center text-fog-sub text-[11px] hover:text-white hover:border-mercury transition-colors"
            >
              <i className="fa-solid fa-camera" />
            </button>
            <input ref={fileInputRef} type="file" accept={avatarText.accept} onChange={onAvatarFileChange} className="hidden" />
          </div>
          <div className="min-h-6 text-base font-bold text-white">{profile?.nickname}</div>
          <div className="min-h-4 text-xs text-fog-muted font-mono">{profile?.userId}</div>
          {profile?.avatarUrl && (
            <button type="button" onClick={resetAvatar} disabled={uploading} className="text-[11px] text-fog-muted hover:text-white underline-offset-2 hover:underline">
              {avatarText.resetLabel}
            </button>
          )}
          {avatarError && (
            <p role="alert" className="text-[11px] text-rose-300 text-center">
              {avatarError}
            </p>
          )}
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
