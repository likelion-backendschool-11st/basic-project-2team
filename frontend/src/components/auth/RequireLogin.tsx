import React from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAccessToken } from '../../api/http';
import { DEFAULT_LOGIN_MESSAGE } from '../../api/loginPrompt';
import { ROUTES } from '../../data/routes';
import LoginRequiredDialog from './LoginRequiredDialog';

/** 로그인하지 않았으면 페이지 대신 「로그인이 필요해요」 모달을 띄웁니다. 돌아가기는 홈으로 보냅니다. */
export const RequireLogin: React.FC<{ readonly children: React.ReactNode; readonly message?: string }> = ({ children, message = DEFAULT_LOGIN_MESSAGE }) => {
  const navigate = useNavigate();
  if (hasAccessToken()) return <>{children}</>;
  return (
    <div className="min-h-screen bg-night-base">
      <LoginRequiredDialog message={message} onLogin={() => navigate(ROUTES.login)} onCancel={() => navigate(ROUTES.home, { replace: true })} />
    </div>
  );
};

export default RequireLogin;
