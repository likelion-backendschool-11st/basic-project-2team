import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { withdraw as withdrawAccount } from '../api/accountApi';
import { clearSession } from '../api/authApi';
import { errorMessageOf } from '../api/http';
import { withdrawAgreements, withdrawText } from '../data/accountData';
import { ROUTES } from '../data/routes';

/** 회원 탈퇴 — 안내 동의 + 비밀번호 재확인 후 DELETE /api/members/me */
export function useWithdrawForm() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Readonly<Record<string, boolean>>>({});
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };
  const onReasonChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReason(e.target.value.slice(0, withdrawText.reasonMax));
    setError(null);
  };

  const canWithdraw = withdrawAgreements.every((a) => checked[a.id]) && password.length > 0 && !submitting;

  /** 성공하면 서버가 모든 토큰을 폐기하므로 이 브라우저의 로그인 정보만 지우고 홈으로 갑니다. */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWithdraw) return;
    setSubmitting(true);
    setError(null);
    try {
      await withdrawAccount(password, reason.trim() || null);
      clearSession();
      navigate(ROUTES.home, { replace: true });
    } catch (err) {
      setError(errorMessageOf(err, withdrawText.failed));
      setSubmitting(false);
    }
  };

  const keep = () => navigate(ROUTES.myPage);

  return { checked, toggle, password, reason, error, submitting, canWithdraw, onPasswordChange, onReasonChange, onSubmit, keep };
}
