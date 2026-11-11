import React from 'react';
import AuthTextField from './AuthTextField';
import VerifyButton from './VerifyButton';
import HelperNotice from './HelperNotice';
import FormAlert from './FormAlert';
import PrimaryButton from './PrimaryButton';
import { useFindIdForm } from '../../hooks/useFindIdForm';
import { findIdText } from '../../data/authData';

interface FindIdFormProps {
  readonly className?: string;
}

export const FindIdForm: React.FC<FindIdFormProps> = ({ className = '' }) => {
  const form = useFindIdForm();
  const { nickname, email } = findIdText.fields;
  return (
    <form className={`space-y-4 ${className}`} noValidate onSubmit={form.onSubmit}>
      <AuthTextField
        icon={nickname.icon}
        id={nickname.id}
        label={nickname.label}
        onChange={form.onNicknameChange}
        placeholder={nickname.placeholder}
        value={form.nickname}
      />
      <div>
        <AuthTextField
          autoComplete={email.autoComplete}
          icon={email.icon}
          id={email.id}
          invalid={form.emailError}
          label={email.label}
          onChange={form.onEmailChange}
          placeholder={email.placeholder}
          trailing={
            <VerifyButton
              label={findIdText.verify}
              onVerify={form.onVerify}
              verified={form.emailVerified}
              verifiedLabel={findIdText.verified}
            />
          }
          type="email"
          value={form.email}
        />
        <HelperNotice>{form.emailError ? findIdText.verifyRequired : findIdText.helper}</HelperNotice>
      </div>
      {form.submitError && <FormAlert message={findIdText.needVerify} />}
      {form.foundId && (
        <FormAlert
          message={
            <>
              {findIdText.resultPrefix} <strong className="text-fog-headline">{form.foundId}</strong> {findIdText.resultSuffix}
            </>
          }
          tone="success"
        />
      )}
      <div className="pt-3">
        <PrimaryButton icon={findIdText.submitIcon} label={findIdText.submit} />
      </div>
    </form>
  );
};

export default FindIdForm;
