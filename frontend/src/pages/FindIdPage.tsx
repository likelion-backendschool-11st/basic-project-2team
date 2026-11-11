import React from 'react';
import { Link } from 'react-router-dom';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthCard from '../components/auth/AuthCard';
import AuthHeading from '../components/auth/AuthHeading';
import RecoveryTabs from '../components/auth/RecoveryTabs';
import FindIdForm from '../components/auth/FindIdForm';
import AuthSecondaryLinks from '../components/auth/AuthSecondaryLinks';
import { findIdText, recoveryTabs } from '../data/authData';

interface FindIdPageProps {
  readonly className?: string;
}

/** Stitch screen: "아이디 찾기" (9788650194224a5695cd6d3c97179433) */
export const FindIdPage: React.FC<FindIdPageProps> = () => (
  <AuthPageShell>
    <AuthCard>
      <AuthHeading icon={findIdText.emblemIcon} subtitle={findIdText.subtitle} title={findIdText.title} />
      <RecoveryTabs activeId="find-id" tabs={recoveryTabs} />
      <FindIdForm />
      <AuthSecondaryLinks alt={findIdText.altLink} back={findIdText.backToLogin} />
    </AuthCard>
    <p className="mt-4 text-center text-xs text-fog-muted">
      {findIdText.supportPrompt}{' '}
      <Link className="ml-0.5 text-fog-sub hover:text-mercury-light underline underline-offset-2" to={findIdText.supportLink.to}>
        {findIdText.supportLink.label}
      </Link>
    </p>
  </AuthPageShell>
);

export default FindIdPage;
