import React from 'react';
import { notificationText, type NotificationView } from '../../data/notificationData';

interface NotificationRowProps {
  readonly notification: NotificationView;
  /** 알림 본문을 누름: 읽음 처리 + 연결된 공고로 이동 */
  readonly onOpen: (notification: NotificationView) => void;
  readonly onMarkRead: (notification: NotificationView) => void;
  readonly onDelete: (notification: NotificationView) => void;
}

const actionBtn =
  'px-2.5 py-1 rounded-md text-xs font-medium border border-night-border text-fog-sub hover:text-white hover:border-night-borderLight transition-colors';

/**
 * 알림 한 줄: 유형 아이콘 · 메시지 · 시각 + 「읽음으로 표시」·「삭제」 버튼.
 * 안 읽은 알림은 강조하고, 본문을 누르면 읽음 처리·공고 이동을 합니다(읽었고 연결 공고도 없으면 본문은 누를 수 없음).
 */
export const NotificationRow: React.FC<NotificationRowProps> = ({ notification: n, onOpen, onMarkRead, onDelete }) => {
  const actionable = !n.read || n.postId !== null;
  const body = (
    <>
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
    </>
  );
  const bodyCls = 'flex-1 min-w-0 flex items-start gap-4 text-left';

  return (
    <li className={`flex items-start gap-3 px-5 py-4 border-b border-night-border last:border-b-0 ${n.read ? '' : 'bg-mercury/5'}`}>
      {actionable ? (
        <button type="button" onClick={() => onOpen(n)} className={`${bodyCls} hover:opacity-90`}>
          {body}
        </button>
      ) : (
        <div className={bodyCls}>{body}</div>
      )}
      <div className="shrink-0 flex flex-col sm:flex-row gap-1.5 self-center">
        {!n.read && (
          <button type="button" onClick={() => onMarkRead(n)} className={actionBtn}>
            {notificationText.markRead}
          </button>
        )}
        <button type="button" onClick={() => onDelete(n)} aria-label={`${notificationText.delete}: ${n.message}`} className={`${actionBtn} hover:text-rose-300`}>
          {notificationText.delete}
        </button>
      </div>
    </li>
  );
};

export default NotificationRow;
