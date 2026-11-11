import React from 'react';
import { commentText } from '../../data/commentData';

interface UserPopoverProps {
  readonly name: string;
  readonly onAction: (message: string) => void;
  readonly onClose: () => void;
}

export const UserPopover: React.FC<UserPopoverProps> = ({ name, onAction, onClose }) => (
  <div className="my-2 rounded-xl border border-mercury/30 bg-night-card p-4 shadow-2xl">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><span className="w-8 h-8 rounded-full bg-mercury/30 flex items-center justify-center">{name[0]}</span>{name}<span className="text-[10px] font-normal text-emerald-300">매너 98.2℃</span></div>
      <button type="button" aria-label="닫기" onClick={onClose} className="text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
    </div>
    <div className="grid grid-cols-1 gap-1.5 text-xs">
      {([['fa-arrow-up-right-from-square', commentText.popover.battle, commentText.popover.battle], ['fa-comment', commentText.popover.dm, commentText.popover.dmSent], ['fa-user-plus', commentText.popover.invite, commentText.popover.invited]] as const).map(([icon, label, message]) => (
        <button key={label} type="button" onClick={() => { onAction(message); onClose(); }} className="flex items-center gap-2 rounded-lg bg-night-base/60 px-3 py-2 text-left text-fog-headline hover:bg-mercury/20"><i className={`fa-solid ${icon} w-4 text-mercury-light`} />{label}</button>
      ))}
    </div>
  </div>
);

export default UserPopover;
