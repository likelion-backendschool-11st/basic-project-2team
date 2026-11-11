import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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

  /** Simulated auth: any id + password of minimum length succeeds. */
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = username.trim().length > 0 && password.length >= loginText.minPasswordLength;
    if (!ok) {
      setError(true);
      return;
    }
    // Demo: the id "admin" lands on the admin dashboard.
    navigate(username.trim() === 'admin' ? ROUTES.admin : loginText.successRedirect);
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
