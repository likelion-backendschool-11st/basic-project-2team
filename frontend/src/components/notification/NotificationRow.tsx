import React from 'react';
import { notificationText, type NotificationView } from '../../data/notificationData';

interface NotificationRowProps {
  readonly notification: NotificationView;
}

/** 알림 한 줄: 유형 아이콘 · 메시지 · 시각. 안 읽은 알림은 강조합니다. (클릭 동작은 읽음 처리 이슈에서 추가) */
export const NotificationRow: React.FC<NotificationRowProps> = ({ notification: n }) => (
  <li
    className={`flex items-start gap-4 px-5 py-4 border-b border-night-border last:border-b-0 ${
      n.read ? '' : 'bg-mercury/5'
    }`}
  >
    <span className={`mt-0.5 w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${n.tone}`}>
      <i className={`${n.icon} text-sm`} aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-xs text-fog-muted">
        <span className="font-semibold">{n.typeLabel}</span>
        <span aria-hidden="true">·</span>
        <time>{n.timeAgo}</time>
        {!n.read && (
          <span className="ml-1 inline-flex items-center gap-1 text-mercury-light font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-mercury-light" aria-hidden="true" />
            {notificationText.unreadMark}
          </span>
        )}
      </div>
      <p className={`mt-1 text-sm break-words ${n.read ? 'text-fog-sub' : 'text-white font-medium'}`}>{n.message}</p>
    </div>
  </li>
);

export default NotificationRow;
