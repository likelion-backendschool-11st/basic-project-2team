import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useEmailVerification } from './useEmailVerification';

type FindPasswordError = 'needVerify' | 'mismatch' | null;

export function useFindPasswordForm() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<FindPasswordError>(null);
  const [success, setSuccess] = useState(false);
  const verification = useEmailVerification();

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
    verification.reset();
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

  const onVerify = () => {
    if (verification.verify(email)) setError(null);
  };

  /** Simulated reset: requires verified email and matching passwords. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verification.verified) {
      setError('needVerify');
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
    emailVerified: verification.verified,
    emailError: verification.error,
    onUserIdChange,
    onEmailChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onVerify,
    onSubmit,
  };
}
