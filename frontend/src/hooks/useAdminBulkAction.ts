import { useState } from 'react';
import { useAdminErrorMessage } from './useAdminSession';
import { useModal } from './useModal';
import { useToast } from './useToast';

/**
 * Confirm dialog with a required reason, then runs `op` for every selected id.
 * Each id is its own API call, so some can fail; the toast reports both counts.
 */
export function useAdminBulkAction(onDone: () => void) {
  const dialog = useModal(false);
  const toast = useToast();
  const toMessage = useAdminErrorMessage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = () => {
    setReason('');
    setError(null);
    dialog.open();
  };

  const changeReason = (value: string) => {
    setReason(value);
    setError(null);
  };

  /** Validates the reason, runs `op(id, reason)` for each id, then reports and calls onDone. */
  const run = async (
    ids: readonly number[],
    op: (id: number, reason: string) => Promise<unknown>,
    success: (count: number) => string,
    requiredMessage: string,
  ) => {
    const text = reason.trim();
    if (!text) {
      setError(requiredMessage);
      return;
    }
    setBusy(true);
    const results = await Promise.allSettled(ids.map((id) => op(id, text)));
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const succeeded = ids.length - failures.length;
    toast.show(failures.length > 0 ? `${success(succeeded)} ${failures.length}건 실패: ${toMessage(failures[0].reason)}` : success(succeeded));
    setBusy(false);
    dialog.close();
    onDone();
  };

  return { dialog: { ...dialog, open }, toast, reason, changeReason, error, busy, run };
}
