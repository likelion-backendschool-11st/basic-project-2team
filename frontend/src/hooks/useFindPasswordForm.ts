import { useState, type ChangeEvent, type FormEvent } from 'react';
import { findAndResetPassword } from '../api/authApi';
import { errorMessageOf } from '../api/http';
import { EMAIL_PATTERN, PASSWORD_PATTERN, findPasswordText } from '../data/authData';

/** 화면 검사 오류는 키(문구는 findPasswordText), 서버 오류는 { message } 로 담습니다. */
type FindPasswordError = 'required' | 'invalidEmail' | 'invalidPassword' | 'mismatch' | { readonly message: string } | null;

export function useFindPasswordForm() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<FindPasswordError>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  /** 화면에서 확인할 수 있는 오류. 새 비밀번호 규칙도 먼저 확인해 재설정 토큰을 헛되이 발급받지 않습니다. */
  const validate = (): FindPasswordError => {
    if (!userId.trim() || !email.trim() || !newPassword || !confirmPassword) return 'required';
    if (!EMAIL_PATTERN.test(email.trim())) return 'invalidEmail';
    if (!PASSWORD_PATTERN.test(newPassword)) return 'invalidPassword';
    if (newPassword !== confirmPassword) return 'mismatch';
    return null;
  };

  /** POST /api/auth/find-password(아이디·이메일 일치 확인 → resetToken) → POST /api/auth/reset-password */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    clearStatus();
    setSubmitting(true);
    try {
      await findAndResetPassword(userId.trim(), email.trim(), newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      setError({ message: errorMessageOf(err, findPasswordText.failed) });
    } finally {
      setSubmitting(false);
    }
  };

  const errorMessage = error === null ? null : typeof error === 'string' ? findPasswordText[error] : error.message;

  return {
    userId,
    email,
    newPassword,
    confirmPassword,
    errorMessage,
    invalidEmail: error === 'invalidEmail',
    invalidPassword: error === 'invalidPassword',
    mismatch: error === 'mismatch',
    success,
    submitting,
    onUserIdChange,
    onEmailChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
  };
}
