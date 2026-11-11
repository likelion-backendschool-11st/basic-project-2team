import React, { useEffect } from 'react';

interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly ariaLabel: string;
  readonly widthClass?: string;
}

/** Centered dialog over a blurred backdrop. Closes on backdrop click and Escape. */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel, widthClass = 'max-w-md' }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${widthClass} rounded-3xl border border-night-borderLight bg-night-surface p-7 shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
