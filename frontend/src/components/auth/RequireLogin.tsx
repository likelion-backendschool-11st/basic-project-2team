import React from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAccessToken } from '../../api/http';
import { ROUTES } from '../../data/routes';
import ConfirmDialog from '../ui/ConfirmDialog';

/** 로그인하지 않았으면 페이지 대신 「로그인 후 사용 가능」 모달을 띄웁니다. */
export const RequireLogin: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  if (hasAccessToken()) return <>{children}</>;
  return (
    <div className="min-h-screen bg-night-base">
      <ConfirmDialog
        isOpen
        tone="warning"
        icon="fa-lock"
        title="로그인이 필요해요"
        description="공고 작성은 로그인 후 사용할 수 있습니다."
        confirmLabel="로그인하기"
        cancelLabel="돌아가기"
        onConfirm={() => navigate(ROUTES.login)}
        onCancel={() => navigate(ROUTES.home, { replace: true })}
      />
    </div>
  );
};

export default RequireLogin;
