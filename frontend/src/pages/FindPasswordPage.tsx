import React from 'react';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthCard from '../components/auth/AuthCard';
import AuthHeading from '../components/auth/AuthHeading';
import RecoveryTabs from '../components/auth/RecoveryTabs';
import FindPasswordForm from '../components/auth/FindPasswordForm';
import AuthSecondaryLinks from '../components/auth/AuthSecondaryLinks';
import { findPasswordText, recoveryTabs } from '../data/authData';

interface FindPasswordPageProps {
  readonly className?: string;
}

/** Stitch screen: "비밀번호 찾기" (a37da0b89dfd4656b72f113dc39f4ef4) */
export const FindPasswordPage: React.FC<FindPasswordPageProps> = () => (
  <AuthPageShell>
    <AuthCard>
      <AuthHeading icon={findPasswordText.emblemIcon} subtitle={findPasswordText.subtitle} title={findPasswordText.title} />
      <RecoveryTabs activeId="find-password" tabs={recoveryTabs} />
      <FindPasswordForm />
      <AuthSecondaryLinks alt={findPasswordText.altLink} back={findPasswordText.backToLogin} />
    </AuthCard>
  </AuthPageShell>
);

export default FindPasswordPage;
