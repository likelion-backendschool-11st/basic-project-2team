import { useState, type ChangeEvent, type FormEvent } from 'react';
import { findIdText } from '../data/authData';
import { useEmailVerification } from './useEmailVerification';

export function useFindIdForm() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const verification = useEmailVerification({ resetAfterMs: findIdText.verifyResetMs });
  const [verifiedOnce, setVerifiedOnce] = useState(false);

  const onNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setFoundId(null);
  };
  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setFoundId(null);
    setVerifiedOnce(false);
    verification.reset();
  };

  const onVerify = () => {
    const ok = verification.verify(email);
    setVerifiedOnce(ok);
    if (ok) setSubmitError(false);
  };

  /** Simulated lookup: returns a mock id once the email has been verified. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verifiedOnce) {
      setSubmitError(true);
      return;
    }
    setSubmitError(false);
    setFoundId(findIdText.mockFoundId);
  };

  return {
    nickname,
    email,
    foundId,
    submitError,
    emailVerified: verification.verified,
    emailError: verification.error,
    onNicknameChange,
    onEmailChange,
    onVerify,
    onSubmit,
  };
}
