import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfileSetupGuard } from '../../hooks/useProfileSetupGuard';

interface ProfileSetupGuardProps {
  readonly children: React.ReactNode;
}

/** 프로필 설정이 필수인 회원은 설정을 마칠 때까지 프로필 수정 화면으로만 보냅니다. */
export const ProfileSetupGuard: React.FC<ProfileSetupGuardProps> = ({ children }) => {
  const redirectTo = useProfileSetupGuard();
  if (redirectTo) return <Navigate replace to={redirectTo} />;
  return <>{children}</>;
};

export default ProfileSetupGuard;
