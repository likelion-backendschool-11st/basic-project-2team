import React from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

/** 「로그인이 필요해요」 모달 본체. 라우트 가드(RequireLogin)와 전역 모달(LoginPromptHost)이 함께 씁니다. */
export const LoginRequiredDialog: React.FC<{ readonly message: string; readonly onLogin: () => void; readonly onCancel: () => void }> = ({ message, onLogin, onCancel }) => (
  <ConfirmDialog
    isOpen
    tone="warning"
    icon="fa-lock"
    title="로그인이 필요해요"
    description={message}
    confirmLabel="로그인하기"
    cancelLabel="돌아가기"
    onConfirm={onLogin}
    onCancel={onCancel}
  />
);

export default LoginRequiredDialog;
