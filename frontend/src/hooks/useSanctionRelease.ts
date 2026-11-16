import { useState } from 'react';
import { releaseSanction, type Sanction } from '../api/adminApi';
import { memberText } from '../data/adminData';
import { useAdminErrorMessage } from './useAdminSession';
import { useModal } from './useModal';
import { useToast } from './useToast';

/** 회원 상세의 제재 해제: 제재 선택 → 사유 입력 팝업 → POST. 성공하면 회원 정보를 다시 불러옵니다. */
export function useSanctionRelease(memberId: number | null, onDone: () => void) {
  const [target, setTarget] = useState<Sanction | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useModal(false);
  const toast = useToast();
  const toMessage = useAdminErrorMessage();

  const open = (sanction: Sanction) => {
    setTarget(sanction);
    setReason('');
    setError(null);
    dialog.open();
  };

  const changeReason = (value: string) => {
    setReason(value);
    setError(null);
  };

  const confirm = async () => {
    if (memberId === null || target === null || busy) return;
    if (!reason.trim()) {
      setError(memberText.reasonRequired);
      return;
    }
    setBusy(true);
    try {
      await releaseSanction(memberId, target.id, reason.trim());
      dialog.close();
      toast.show(memberText.releasedToast);
      onDone();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { target, reason, changeReason, error, busy, dialog, toast, open, confirm };
}
