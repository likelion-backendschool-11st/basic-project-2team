import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deletePost } from '../api/adminApi';
import { postText } from '../data/adminData';
import { ROUTES } from '../data/routes';
import { useAdminErrorMessage } from './useAdminSession';
import { useModal } from './useModal';
import { useToast } from './useToast';

/** 공고 상세의 삭제 폼: 사유 필수 → 확인 → DELETE. "작성자 제재 검토" 를 고르면 신고 관리로 이동합니다. */
export function usePostDelete(postId: number | null, onDone: () => void) {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [reviewSanction, setReviewSanction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useModal(false);
  const toast = useToast();
  const toMessage = useAdminErrorMessage();

  const changeReason = (value: string) => {
    setReason(value);
    setError(null);
  };

  const submit = () => (reason.trim() ? confirm.open() : setError(postText.reasonRequired));

  const confirmDelete = async () => {
    if (postId === null || busy) return;
    setBusy(true);
    try {
      await deletePost(postId, reason.trim());
      confirm.close();
      if (reviewSanction) {
        navigate(ROUTES.adminReports);
        return;
      }
      toast.show(postText.deletedOne);
      setReason('');
      onDone();
    } catch (err) {
      confirm.close();
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { reason, changeReason, reviewSanction, setReviewSanction, error, busy, confirm, toast, submit, confirmDelete };
}
