import React from 'react';
import Modal from './Modal';

interface NoticeDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly onClose: () => void;
}

/** 확인 버튼 하나뿐인 경고 안내 모달 (욕설 필터 등) */
export const NoticeDialog: React.FC<NoticeDialogProps> = ({ isOpen, title, description, confirmLabel, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} ariaLabel={title}>
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl bg-amberAccent/15 text-amberAccent">
        <i className="fa-solid fa-triangle-exclamation" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-fog-sub leading-relaxed whitespace-pre-line">{description}</p>
    </div>
    <button type="button" onClick={onClose} className="mt-6 w-full h-12 rounded-xl text-sm font-bold text-night-base bg-amberAccent hover:brightness-110 transition-all">
      {confirmLabel}
    </button>
  </Modal>
);

export default NoticeDialog;
