import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoggedInLayout from '../components/user/LoggedInLayout';
import Pagination from '../components/board/Pagination';
import NotificationRow from '../components/notification/NotificationRow';
import NotificationSettingsPanel from '../components/notification/NotificationSettingsPanel';
import { notificationText } from '../data/notificationData';
import { ROUTES } from '../data/routes';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationsPageProps {
  readonly className?: string;
}

const tabBase = 'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border';
const tabOn = `${tabBase} bg-mercury/15 border-mercury/40 text-mercury-light`;
const tabOff = `${tabBase} bg-night-base border-night-border text-fog-sub hover:text-white`;

/** 알림 페이지. Route: /notifications (서버: GET /api/notifications) */
export const NotificationsPage: React.FC<NotificationsPageProps> = () => {
  const n = useNotifications();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <LoggedInLayout>
      <div className="max-w-3xl w-full mx-auto py-4 flex flex-col gap-5">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{notificationText.title}</h1>
            {n.loggedIn && (
              <p className="mt-1 text-sm text-fog-muted">
                {n.unreadCount > 0 ? notificationText.unreadCount(n.unreadCount) : notificationText.allRead}
              </p>
            )}
          </div>
          {n.loggedIn && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void n.markAllRead()}
                disabled={n.unreadCount === 0 || n.markingAll}
                className="text-sm font-medium text-mercury-light hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-default"
              >
                {notificationText.markAllRead}
              </button>
              <button
                type="button"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((open) => !open)}
                className="text-sm font-medium text-fog-sub hover:text-white flex items-center gap-1.5"
              >
                <i className="fa-solid fa-gear text-xs" aria-hidden="true" />
                {notificationText.settings}
              </button>
              <div role="group" aria-label={notificationText.filterAriaLabel} className="flex gap-2">
                <button type="button" aria-pressed={!n.unreadOnly} onClick={() => n.setUnreadOnly(false)} className={n.unreadOnly ? tabOff : tabOn}>
                  {notificationText.filterAll}
                </button>
                <button type="button" aria-pressed={n.unreadOnly} onClick={() => n.setUnreadOnly(true)} className={n.unreadOnly ? tabOn : tabOff}>
                  {notificationText.filterUnread}
                </button>
              </div>
            </div>
          )}
        </header>
        {n.loggedIn && settingsOpen && <NotificationSettingsPanel onClose={() => setSettingsOpen(false)} />}
        {n.actionError && (
          <p role="alert" className="text-sm text-rose-300">
            {n.actionError}
          </p>
        )}

        {!n.loggedIn ? (
          <div className="bg-night-surface border border-night-border rounded-2xl p-10 text-center text-sm text-fog-sub">
            {notificationText.loginRequired}
            <Link to={ROUTES.login} className="ml-3 text-mercury-light font-semibold hover:underline">
              {notificationText.goLogin}
            </Link>
          </div>
        ) : n.error ? (
          <div role="alert" className="bg-night-surface border border-night-border rounded-2xl p-10 text-center text-sm text-rose-300">
            {n.error}
            <button type="button" onClick={n.reload} className="ml-3 text-mercury-light font-semibold hover:underline">
              {notificationText.retry}
            </button>
          </div>
        ) : n.items.length === 0 ? (
          <div className="bg-night-surface border border-night-border rounded-2xl p-10 text-center text-sm text-fog-muted">
            {n.loading ? notificationText.loading : n.unreadOnly ? notificationText.emptyUnread : notificationText.empty}
          </div>
        ) : (
          <>
            <ul
              aria-label={notificationText.listAriaLabel}
              aria-busy={n.loading}
              className={`bg-night-surface border border-night-border rounded-2xl overflow-hidden transition-opacity ${n.loading ? 'opacity-60' : ''}`}
            >
              {n.items.map((item) => (
                <NotificationRow key={item.id} notification={item} onOpen={n.open} onMarkRead={n.markRead} onDelete={n.remove} />
              ))}
            </ul>
            {n.pager.pages.length > 1 && (
              <div className="flex justify-center">
                <Pagination {...n.pager} />
              </div>
            )}
          </>
        )}
      </div>
    </LoggedInLayout>
  );
};

export default NotificationsPage;
