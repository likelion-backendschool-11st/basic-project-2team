import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly icon?: string;
  readonly tone?: 'danger' | 'warning' | 'brand';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly children?: React.ReactNode;
}

const tones = {
  danger: { badge: 'bg-roseAccent/15 text-roseAccent', button: 'bg-roseAccent hover:brightness-110' },
  warning: { badge: 'bg-amberAccent/15 text-amberAccent', button: 'bg-amberAccent text-night-base hover:brightness-110' },
  brand: { badge: 'bg-mercury/15 text-mercury-light', button: 'bg-mercury hover:bg-mercury-light' },
} as const;

/** Yes/no confirmation (write-cancel, leave party, disband, delete…). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  icon = 'fa-triangle-exclamation',
  tone = 'danger',
  onConfirm,
  onCancel,
  children,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} ariaLabel={title}>
    <div className="flex flex-col items-center text-center gap-3">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${tones[tone].badge}`}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-sm text-fog-sub leading-relaxed">{description}</p>
      {children}
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3">
      <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white hover:bg-white/5">
        {cancelLabel}
      </button>
      <button type="button" onClick={onConfirm} className={`h-12 rounded-xl text-sm font-bold text-white transition-all ${tones[tone].button}`}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
