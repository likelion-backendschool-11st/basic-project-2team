import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { loginText } from '../data/authData';
import { ROUTES } from '../data/routes';

export function useLoginForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(false);

  const onUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError(false);
  };
  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(false);
  };
  const onRememberMeChange = (e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = username.trim();
    if (!id || !password || submitting) {
      setError(true);
      return;
    }
    // Demo: 관리자 로그인 API 는 아직 연결 전이라 id "admin" 은 기존처럼 관리자 대시보드로 보냅니다.
    if (id === 'admin') {
      navigate(ROUTES.admin);
      return;
    }
    setSubmitting(true);
    try {
      await login(id, password, rememberMe);
      navigate(loginText.successRedirect);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    username,
    password,
    rememberMe,
    error,
    onUsernameChange,
    onPasswordChange,
    onRememberMeChange,
    onSubmit,
  };
}
