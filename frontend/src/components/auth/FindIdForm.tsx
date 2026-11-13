import React from 'react';
import AuthTextField from './AuthTextField';
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
          invalid={form.error === 'invalidEmail'}
          label={email.label}
          onChange={form.onEmailChange}
          placeholder={email.placeholder}
          type="email"
          value={form.email}
        />
        <HelperNotice>{findIdText.helper}</HelperNotice>
      </div>
      {form.error && <FormAlert message={findIdText[form.error]} />}
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
