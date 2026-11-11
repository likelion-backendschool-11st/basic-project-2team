import React from 'react';
import AuthPageShell from '../components/auth/AuthPageShell';
import AuthHeading from '../components/auth/AuthHeading';
import AuthCard from '../components/auth/AuthCard';
import LoginForm from '../components/auth/LoginForm';
import LoginAccountLinks from '../components/auth/LoginAccountLinks';
import LoginMetaBar from '../components/auth/LoginMetaBar';
import { loginText } from '../data/authData';

interface LoginPageProps {
  readonly className?: string;
}

/** Stitch screen: "로그인" (93766853967a41d99352ee0b75f48459) */
export const LoginPage: React.FC<LoginPageProps> = () => (
  <AuthPageShell maxWidthClassName="max-w-[460px]">
    <AuthHeading icon={loginText.emblemIcon} size="hero" subtitle={loginText.subtitle} title={loginText.title} />
    <AuthCard variant="hero">
      <LoginForm />
      <LoginAccountLinks
        recoveryLinks={loginText.recoveryLinks}
        signupLink={loginText.signupLink}
        signupPrompt={loginText.signupPrompt}
      />
    </AuthCard>
    <LoginMetaBar {...loginText.meta} />
  </AuthPageShell>
);

export default LoginPage;
