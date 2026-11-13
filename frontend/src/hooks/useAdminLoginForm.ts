import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api/adminApi';
import { ApiRequestError } from '../api/http';
import { adminLoginText } from '../data/adminData';
import { ROUTES } from '../data/routes';

/** 관리자 로그인 폼: 성공하면 관리자 토큰을 저장하고 대시보드로 이동합니다. */
export function useAdminLoginForm() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onUserIdChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
    setError(null);
  };
  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError(adminLoginText.required);
      return;
    }
    setSubmitting(true);
    try {
      await adminLogin(userId.trim(), password);
      navigate(ROUTES.admin, { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : adminLoginText.required);
      setSubmitting(false);
    }
  };

  return { userId, password, error, submitting, onUserIdChange, onPasswordChange, onSubmit };
}
