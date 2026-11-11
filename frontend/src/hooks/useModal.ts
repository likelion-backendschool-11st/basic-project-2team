import { useCallback, useEffect, useState } from 'react';

interface UseModalOptions {
  /** Called after the modal closes (e.g. navigate away). */
  readonly onClose?: () => void;
  /** Close when Escape is pressed while open. Default true. */
  readonly closeOnEscape?: boolean;
}

export function useModal(initialOpen = false, { onClose, closeOnEscape = true }: UseModalOptions = {}) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeOnEscape, close]);

  return { isOpen, open, close, toggle };
}
