import { useState, type ChangeEvent, type FormEvent } from 'react';
import { findId } from '../api/authApi';
import { errorMessageOf } from '../api/http';
import { EMAIL_PATTERN, findIdText } from '../data/authData';

/** 화면 검사 오류는 키(문구는 findIdText), 서버 오류는 { message } 로 담습니다. */
type FindIdError = 'required' | 'invalidEmail' | { readonly message: string } | null;

export function useFindIdForm() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);
  const [error, setError] = useState<FindIdError>(null);
  const [submitting, setSubmitting] = useState(false);

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

  /** POST /api/auth/find-id — 닉네임·이메일이 모두 일치하는 회원의 아이디 (없으면 404 MEMBER_NOT_FOUND) */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!nickname.trim() || !email.trim()) {
      setError('required');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('invalidEmail');
      return;
    }
    clearStatus();
    setSubmitting(true);
    try {
      const result = await findId(nickname.trim(), email.trim());
      setFoundId(result.userId);
    } catch (err) {
      setError({ message: errorMessageOf(err, findIdText.failed) });
    } finally {
      setSubmitting(false);
    }
  };

  const errorMessage = error === null ? null : typeof error === 'string' ? findIdText[error] : error.message;

  return {
    nickname,
    email,
    foundId,
    errorMessage,
    invalidEmail: error === 'invalidEmail',
    submitting,
    onNicknameChange,
    onEmailChange,
    onSubmit,
  };
}
