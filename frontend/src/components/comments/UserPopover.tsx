import React from 'react';
import { commentText } from '../../data/commentData';
import type { CommentAuthorProfile } from '../../hooks/useComments';

interface UserPopoverProps {
  readonly name: string;
  /** GET /api/members/{memberId} 결과. 불러오는 중이면 'loading', 실패하면 'error' */
  readonly profile: CommentAuthorProfile;
  readonly onAction: (message: string) => void;
  readonly onClose: () => void;
}

/** 댓글 작성자 프로필 팝오버: 레벨·매너 온도·대표 게임 + 빠른 동작 */
export const UserPopover: React.FC<UserPopoverProps> = ({ name, profile, onAction, onClose }) => {
  const loaded = typeof profile === 'object' ? profile : null;
  const mainGame = loaded?.games.find((g) => g.isMain) ?? loaded?.games[0];
  return (
    <div className="my-2 rounded-xl border border-mercury/30 bg-night-card p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="w-8 h-8 rounded-full bg-mercury/30 flex items-center justify-center">{Array.from(name)[0]}</span>
          {name}
          {loaded && (
            <>
              <span className="text-[10px] px-1.5 rounded bg-mercury/20 text-mercury-light font-normal">{commentText.popover.level(loaded.level)}</span>
              <span className="text-[10px] font-normal text-emerald-300">{commentText.popover.manner(`${loaded.mannerTemp.toFixed(1)}℃`)}</span>
            </>
          )}
          {profile === 'loading' && <span className="text-[10px] font-normal text-fog-muted">{commentText.popover.loading}</span>}
        </div>
        <button type="button" aria-label="닫기" onClick={onClose} className="text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
      </div>
      {mainGame && <p className="mb-3 text-[11px] text-fog-muted"><i className="fa-solid fa-gamepad mr-1.5 text-mercury-light" />{mainGame.name}</p>}
      <div className="grid grid-cols-1 gap-1.5 text-xs">
        {([['fa-arrow-up-right-from-square', commentText.popover.battle, commentText.popover.battle], ['fa-comment', commentText.popover.dm, commentText.popover.dmSent], ['fa-user-plus', commentText.popover.invite, commentText.popover.invited]] as const).map(([icon, label, message]) => (
          <button key={label} type="button" onClick={() => { onAction(message); onClose(); }} className="flex items-center gap-2 rounded-lg bg-night-base/60 px-3 py-2 text-left text-fog-headline hover:bg-mercury/20"><i className={`fa-solid ${icon} w-4 text-mercury-light`} />{label}</button>
        ))}
      </div>
    </div>
  );
};

export default UserPopover;
