import React from 'react';
import { signupFields as f, signupText as t, termItems } from '../../data/signupData';
import { useSignupForm } from '../../hooks/useSignupForm';
import SectionHeading from './SectionHeading';
import TextField from './TextField';
import DuplicateCheckField from './DuplicateCheckField';
import PasswordField from './PasswordField';
import FieldStatusMessage from './FieldStatusMessage';
import InfoNote from './InfoNote';
import TermsAgreementBox from './TermsAgreementBox';
import SignupSubmitSection from './SignupSubmitSection';

interface SignupFormCardProps {
  readonly className?: string;
}

export const SignupFormCard: React.FC<SignupFormCardProps> = ({ className = '' }) => {
  const form = useSignupForm();
  const { values, checks, checkMessageOf, onFieldChange, runDuplicateCheck } = form;

  return (
    <form
      noValidate
      onSubmit={form.onSubmit}
      className={`w-full bg-night-base/90 backdrop-blur-xl rounded-2xl p-6 md:p-12 shadow-2xl flex flex-col gap-8 ${className}`}
    >
      {/* 기본 정보 */}
      <div className="flex flex-col gap-4">
        <SectionHeading title={t.basicSectionTitle} hint={t.basicSectionHint} />
        <TextField field={f.name} value={values.name} onChange={onFieldChange('name')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField field={f.phone} value={values.phone} onChange={onFieldChange('phone')} />
          <TextField field={f.address} value={values.address} onChange={onFieldChange('address')} />
        </div>
      </div>

      <div className="w-full h-px bg-night-card" />

      {/* 계정 정보 */}
      <div className="flex flex-col gap-6">
        <DuplicateCheckField
          field={f.userId}
          value={values.userId}
          status={checks.userId}
          statusMessage={checkMessageOf('userId')}
          buttonLabel={t.checkButton}
          onChange={onFieldChange('userId')}
          onCheck={() => runDuplicateCheck('userId')}
        />
        <DuplicateCheckField
          field={f.nickname}
          value={values.nickname}
          status={checks.nickname}
          statusMessage={checkMessageOf('nickname')}
          buttonLabel={t.checkButton}
          onChange={onFieldChange('nickname')}
          onCheck={() => runDuplicateCheck('nickname')}
        />
        <div className="flex flex-col gap-4">
          <PasswordField
            field={f.password}
            value={values.password}
            onChange={onFieldChange('password')}
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
          />
          <PasswordField
            field={f.passwordConfirm}
            value={values.passwordConfirm}
            onChange={onFieldChange('passwordConfirm')}
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
          >
            {form.passwordMismatch && <FieldStatusMessage tone="error" message={t.passwordMismatch} />}
            {form.passwordMatch && <FieldStatusMessage tone="success" message={t.passwordMatch} />}
            <p className="text-xs text-fog-muted/70 pt-0.5">{t.passwordGuide}</p>
          </PasswordField>
        </div>
        <DuplicateCheckField
          field={f.email}
          value={values.email}
          status={checks.email}
          statusMessage={checkMessageOf('email')}
          buttonLabel={t.checkButton}
          onChange={onFieldChange('email')}
          onCheck={() => runDuplicateCheck('email')}
          aside={<InfoNote text={t.emailNote} />}
        />
      </div>

      <TermsAgreementBox
        title={t.termsTitle}
        agreeAllLabel={t.agreeAll}
        requiredLabel={t.requiredBadge}
        optionalLabel={t.optionalBadge}
        viewLabel={t.viewTerms}
        terms={termItems}
        agreed={form.agreed}
        allAgreed={form.allAgreed}
        onToggle={form.toggleTerm}
        onToggleAll={form.toggleAll}
      />

      <SignupSubmitSection
        submitLabel={t.submit}
        haveAccountLabel={t.haveAccount}
        loginLabel={t.loginLink}
        loginTo={t.loginTo}
        error={form.submitError}
        submitting={form.submitting}
      />
    </form>
  );
};

export default SignupFormCard;
