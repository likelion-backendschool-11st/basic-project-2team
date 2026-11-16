import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGIN_PROMPT_EVENT, closeLoginPrompt } from '../../api/loginPrompt';
import { ROUTES } from '../../data/routes';
import LoginRequiredDialog from './LoginRequiredDialog';

/** promptLogin() 신호를 받아 어느 화면에서든 같은 로그인 안내 모달을 띄웁니다. App 에 한 번만 둡니다. */
export const LoginPromptHost: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener(LOGIN_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(LOGIN_PROMPT_EVENT, onPrompt);
  }, []);

  if (message === null) return null;
  const close = () => {
    closeLoginPrompt();
    setMessage(null);
  };
  return (
    <LoginRequiredDialog
      message={message}
      onLogin={() => {
        close();
        navigate(ROUTES.login);
      }}
      onCancel={close}
    />
  );
};

export default LoginPromptHost;
