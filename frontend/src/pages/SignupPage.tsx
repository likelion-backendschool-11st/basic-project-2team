import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import AmbientGlow from '../components/signup/AmbientGlow';
import SignupHero from '../components/signup/SignupHero';
import SignupFormCard from '../components/signup/SignupFormCard';
import TrustIndicators from '../components/signup/TrustIndicators';
import { signupText, signupTrustIndicators } from '../data/signupData';

interface SignupPageProps {
  readonly className?: string;
}

/** Stitch screen: "회원가입" (308ab93facf547e590c5379c12b8b917) */
export const SignupPage: React.FC<SignupPageProps> = () => (
  <AppLayout contained={false} showNav={false}>
    <div className="flex-1 flex flex-col justify-center bg-night-deep overflow-hidden">
      <div className="relative flex flex-col w-full items-center justify-center py-8 px-4 md:px-8">
        <AmbientGlow variant="signup" />
        <div className="relative w-full max-w-xl mx-auto flex flex-col items-center">
          <SignupHero eyebrow={signupText.eyebrow} title={signupText.title} subtitle={signupText.subtitle} />
          <SignupFormCard />
          <TrustIndicators items={signupTrustIndicators} />
        </div>
      </div>
    </div>
  </AppLayout>
);

export default SignupPage;
