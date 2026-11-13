import React from 'react';
import { Link } from 'react-router-dom';
import AuthTextField from './AuthTextField';
import HelperNotice from './HelperNotice';
import FormAlert from './FormAlert';
import PrimaryButton from './PrimaryButton';
import { useFindPasswordForm } from '../../hooks/useFindPasswordForm';
import { findPasswordText } from '../../data/authData';

interface FindPasswordFormProps {
  readonly className?: string;
}

export const FindPasswordForm: React.FC<FindPasswordFormProps> = ({ className = '' }) => {
  const form = useFindPasswordForm();
  const { userId, email, newPassword, confirmPassword } = findPasswordText.fields;
  const errorMessage = form.error ? findPasswordText[form.error] : null;

  return (
    <form className={`space-y-4 ${className}`} noValidate onSubmit={form.onSubmit}>
      <fieldset className="space-y-3.5 pb-2">
        <legend className="sr-only">{findPasswordText.verifyLegend}</legend>
        <AuthTextField
          autoComplete={userId.autoComplete}
          id={userId.id}
          label={userId.label}
          onChange={form.onUserIdChange}
          placeholder={userId.placeholder}
          value={form.userId}
        />
        <div>
          <AuthTextField
            autoComplete={email.autoComplete}
            id={email.id}
            invalid={form.error === 'invalidEmail'}
            label={email.label}
            onChange={form.onEmailChange}
            placeholder={email.placeholder}
            type="email"
            value={form.email}
          />
          <HelperNotice>{findPasswordText.helper}</HelperNotice>
        </div>
      </fieldset>

      <div className="border-t border-night-border my-2" />

      <fieldset className="space-y-3.5">
        <legend className="sr-only">{findPasswordText.newPasswordLegend}</legend>
        <AuthTextField
          autoComplete={newPassword.autoComplete}
          id={newPassword.id}
          label={newPassword.label}
          onChange={form.onNewPasswordChange}
          placeholder={newPassword.placeholder}
          type="password"
          value={form.newPassword}
        />
        <AuthTextField
          autoComplete={confirmPassword.autoComplete}
          id={confirmPassword.id}
          invalid={form.error === 'mismatch'}
          label={confirmPassword.label}
          onChange={form.onConfirmPasswordChange}
          placeholder={confirmPassword.placeholder}
          type="password"
          value={form.confirmPassword}
        />
      </fieldset>

      {errorMessage && <FormAlert message={errorMessage} />}
      {form.success && (
        <FormAlert
          message={
            <>
              {findPasswordText.success}{' '}
              <Link className="underline underline-offset-2" to={findPasswordText.backToLogin.to}>
                {findPasswordText.backToLogin.label}
              </Link>
            </>
          }
          tone="success"
        />
      )}

      <div className="pt-4">
        <PrimaryButton label={findPasswordText.submit} />
      </div>
    </form>
  );
};

export default FindPasswordForm;
