import { useState, type ChangeEvent, type FormEvent } from 'react';
import { EMAIL_PATTERN } from '../data/authData';

type FindPasswordError = 'required' | 'invalidEmail' | 'mismatch' | null;

export function useFindPasswordForm() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<FindPasswordError>(null);
  const [success, setSuccess] = useState(false);

  const clearStatus = () => {
    setError(null);
    setSuccess(false);
  };

  const onUserIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
    clearStatus();
  };
  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearStatus();
  };
  const onNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    clearStatus();
  };
  const onConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    clearStatus();
  };

  /**
   * Simulated reset. 실제 연동 시 POST /api/auth/find-password(아이디·이메일 일치 확인 → resetToken)
   * → POST /api/auth/reset-password 를 차례로 호출합니다.
   */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId.trim() || !email.trim() || !newPassword || !confirmPassword) {
      setError('required');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('invalidEmail');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('mismatch');
      return;
    }
    setError(null);
    setSuccess(true);
  };

  return {
    userId,
    email,
    newPassword,
    confirmPassword,
    error,
    success,
    onUserIdChange,
    onEmailChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
  };
}
