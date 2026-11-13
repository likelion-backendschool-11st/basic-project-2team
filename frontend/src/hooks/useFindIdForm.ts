import { useState, type ChangeEvent, type FormEvent } from 'react';
import { EMAIL_PATTERN, findIdText } from '../data/authData';

type FindIdError = 'required' | 'invalidEmail' | null;

export function useFindIdForm() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);
  const [error, setError] = useState<FindIdError>(null);

  const clearStatus = () => {
    setFoundId(null);
    setError(null);
  };

  const onNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    clearStatus();
  };
  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    clearStatus();
  };

  /** Simulated lookup (POST /api/auth/find-id): 닉네임·이메일 입력값만 확인하고 목 아이디를 보여줍니다. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nickname.trim() || !email.trim()) {
      setError('required');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('invalidEmail');
      return;
    }
    setError(null);
    setFoundId(findIdText.mockFoundId);
  };

  return {
    nickname,
    email,
    foundId,
    error,
    onNicknameChange,
    onEmailChange,
    onSubmit,
  };
}
