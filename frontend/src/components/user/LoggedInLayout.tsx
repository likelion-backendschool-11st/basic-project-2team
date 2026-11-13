import React from 'react';
import AppLayout from '../layout/AppLayout';

interface LoggedInLayoutProps {
  readonly children: React.ReactNode;
  readonly contained?: boolean;
}

/** AppLayout (헤더는 로그인 상태에 따라 스스로 바뀝니다). */
export const LoggedInLayout: React.FC<LoggedInLayoutProps> = ({ children, contained = true }) => (
  <AppLayout contained={contained}>
    {children}
  </AppLayout>
);

export default LoggedInLayout;
