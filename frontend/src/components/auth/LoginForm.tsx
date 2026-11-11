import React from 'react';
import AuthTextField from './AuthTextField';
import FormAlert from './FormAlert';
import RememberMeCheckbox from './RememberMeCheckbox';
import PrimaryButton from './PrimaryButton';
import { useLoginForm } from '../../hooks/useLoginForm';
import { loginText } from '../../data/authData';

interface LoginFormProps {
  readonly className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ className = '' }) => {
  const form = useLoginForm();
  const { username, password } = loginText.fields;
  return (
    <form className={`flex flex-col gap-6 ${className}`} noValidate onSubmit={form.onSubmit}>
      <AuthTextField
        autoComplete={username.autoComplete}
        hint={username.hint}
        icon={username.icon}
        id={username.id}
        invalid={form.error}
        label={username.label}
        onChange={form.onUsernameChange}
        placeholder={username.placeholder}
        size="lg"
        value={form.username}
      />
      <AuthTextField
        autoComplete={password.autoComplete}
        hint={password.hint}
        icon={password.icon}
        id={password.id}
        invalid={form.error}
        label={password.label}
        onChange={form.onPasswordChange}
        placeholder={password.placeholder}
        size="lg"
        type="password"
        value={form.password}
      />
      {form.error && <FormAlert message={loginText.errorMessage} />}
      <div className="flex items-center justify-between pt-1">
        <RememberMeCheckbox checked={form.rememberMe} label={loginText.rememberMe} onChange={form.onRememberMeChange} />
      </div>
      <PrimaryButton icon={loginText.submitIcon} iconPosition="trailing" label={loginText.submit} shape="pill" />
    </form>
  );
};

export default LoginForm;
