import React from 'react';
import { MAX_SUBSCRIPTIONS, notificationText } from '../../data/notificationData';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

interface NotificationSettingsPanelProps {
  readonly onClose: () => void;
}

const field =
  'bg-night-base border border-night-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mercury disabled:opacity-50';

/** 알림 설정 패널: 관심 게임(상세 분류) 알림을 추가하고 항목별로 켜고 끄거나 지웁니다. (docs/API_SPEC.md 알림함 · REQ-NOTI-001) */
export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({ onClose }) => {
  const s = useNotificationSettings(true);
  const full = s.subscriptions.length >= MAX_SUBSCRIPTIONS;

  return (
    <section aria-label={notificationText.settingsPanelLabel} className="bg-night-surface border border-night-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-gamepad text-mercury-light" aria-hidden="true" />
            {notificationText.settingsTitle}
          </h2>
          <p className="mt-1 text-xs text-fog-muted">{notificationText.settingsDesc}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="text-fog-muted hover:text-white">
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>

      {s.error && (
        <p role="alert" className="text-sm text-rose-300">
          {s.error}
          {!s.loaded && (
            <button type="button" onClick={s.reload} className="ml-3 text-mercury-light font-semibold hover:underline">
              {notificationText.retry}
            </button>
          )}
        </p>
      )}

      {s.loaded && (
        <>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void s.add();
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-fog-muted">
              {notificationText.settingsGame}
              <select value={s.gameCode} onChange={(e) => s.setGameCode(e.target.value)} disabled={full || s.saving} className={field}>
                <option value="">{notificationText.settingsGamePlaceholder}</option>
                {s.games.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-fog-muted">
              {notificationText.settingsDetail}
              <select value={s.detailCode} onChange={(e) => s.setDetailCode(e.target.value)} disabled={!s.gameCode || full || s.saving} className={field}>
                <option value="">{notificationText.settingsDetailAll}</option>
                {s.detailOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={!s.gameCode || full || s.saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-mercury text-white hover:bg-mercury-light transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {s.saving ? notificationText.settingsAdding : notificationText.settingsAdd}
            </button>
            {full && <span className="text-xs text-fog-muted">{notificationText.settingsLimit(MAX_SUBSCRIPTIONS)}</span>}
          </form>

          {s.subscriptions.length === 0 ? (
            <p className="text-sm text-fog-muted">{notificationText.settingsEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-night-border border border-night-border rounded-xl">
              {s.subscriptions.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className={`text-sm ${item.enabled ? 'text-white font-medium' : 'text-fog-muted'}`}>{item.name}</span>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        role="switch"
                        className="sr-only peer"
                        checked={item.enabled}
                        aria-label={notificationText.settingsSwitchLabel(item.name)}
                        onChange={() => s.toggle(item)}
                      />
                      <span className="block w-10 h-6 rounded-full bg-night-card peer-checked:bg-mercury relative transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-mercury" />
                    </label>
                    <button
                      type="button"
                      onClick={() => s.remove(item)}
                      aria-label={`${notificationText.settingsRemove}: ${item.name}`}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-night-border text-fog-sub hover:text-rose-300 hover:border-night-borderLight transition-colors"
                    >
                      {notificationText.settingsRemove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {s.loading && !s.loaded && <p className="text-sm text-fog-muted">{notificationText.settingsLoading}</p>}
    </section>
  );
};

export default NotificationSettingsPanel;
