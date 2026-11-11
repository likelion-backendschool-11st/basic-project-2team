import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import AmbientGlow from '../components/signup/AmbientGlow';
import CelebrationEmblem from '../components/signup/CelebrationEmblem';
import StatusPill from '../components/signup/StatusPill';
import WelcomeMessage from '../components/signup/WelcomeMessage';
import HighlightBanner from '../components/signup/HighlightBanner';
import PerkCard from '../components/signup/PerkCard';
import CompleteActions from '../components/signup/CompleteActions';
import SecurityNote from '../components/signup/SecurityNote';
import { signupCompleteText as t, signupPerks } from '../data/signupData';
import { useSignupComplete } from '../hooks/useSignupComplete';

interface SignupCompletePageProps {
  readonly className?: string;
}

/** Stitch screen: "회원가입 완료" (9c52a831aa55472e9c3740414fcdaa27) */
export const SignupCompletePage: React.FC<SignupCompletePageProps> = () => {
  const { nickname } = useSignupComplete();
  return (
    <AppLayout contained={false} showNav={false}>
      <div className="flex-1 flex flex-col items-center justify-center bg-night-deep overflow-hidden py-12 px-4 md:px-8 lg:px-16">
        <div className="relative w-full max-w-xl mx-auto flex flex-col items-center">
          <AmbientGlow variant="complete" />
          <div className="relative w-full bg-night-surface/95 backdrop-blur-2xl rounded-3xl p-8 md:p-12 shadow-2xl shadow-black/50 flex flex-col items-center text-center">
            <CelebrationEmblem />
            <StatusPill label={t.statusPill} />
            <WelcomeMessage title={t.title} nickname={nickname} suffix={t.welcomeSuffix} body={t.welcomeBody} />
            <HighlightBanner text={t.banner} />
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
              {signupPerks.map((perk) => (
                <PerkCard key={perk.id} perk={perk} />
              ))}
            </div>
            <CompleteActions loginLabel={t.loginButton} loginTo={t.loginTo} homeLabel={t.homeLink} homeTo={t.homeTo} />
          </div>
          <SecurityNote text={t.securityNote} />
        </div>
      </div>
    </AppLayout>
  );
};

export default SignupCompletePage;
