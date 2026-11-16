import React from 'react';
import AccountShell from '../components/account/AccountShell';
import FormActions from '../components/account/FormActions';
import RequirementPill from '../components/account/RequirementPill';
import FieldStatusMessage from '../components/signup/FieldStatusMessage';
import PasswordField from '../components/signup/PasswordField';
import { accountPanelText, passwordFields, passwordText } from '../data/accountData';
import { ROUTES } from '../data/routes';
import { Link } from 'react-router-dom';
import { usePasswordChangeForm } from '../hooks/usePasswordChangeForm';

interface PasswordChangePageProps {
  readonly className?: string;
}

/** Stitch screen: "OurParty 마이페이지 - 비밀번호 변경" (8bc5786e691a4d13bb1e662cdccef17b) */
export const PasswordChangePage: React.FC<PasswordChangePageProps> = () => {
  const form = usePasswordChangeForm();
  const text = accountPanelText.password;
  const currentMsg =
    form.error?.field === 'current'
      ? { tone: 'error' as const, message: form.error.message }
      : { tone: 'hint' as const, message: passwordText.currentHint };

  if (form.done) {
    return (
      <AccountShell active="password" title={text.title} description={text.description}>
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <FieldStatusMessage tone="success" message={passwordText.done} />
          <Link to={ROUTES.login} replace className="h-12 px-7 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-mercury hover:bg-mercury-light shadow-lg shadow-mercury/30">
            <i className="fa-solid fa-right-to-bracket" />
            {passwordText.goLogin}
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell active="password" title={text.title} description={text.description}>
      <form onSubmit={form.onSubmit} className="flex flex-col gap-6">
        {passwordFields.map((f) => (
          <div key={f.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white">
                {f.label} <span className="text-mercury-light">*</span>
              </span>
              <span className="text-xs text-fog-muted">{f.side}</span>
            </div>
            <PasswordField
              field={{ key: 'password', id: f.id, label: '', type: 'password', placeholder: f.placeholder, autoComplete: f.autoComplete }}
              value={form.values[f.id]}
              onChange={form.onChange(f.id)}
              showLabel={passwordText.showLabel}
              hideLabel={passwordText.hideLabel}
            />
            {f.id === 'current' && <FieldStatusMessage tone={currentMsg.tone} message={currentMsg.message} />}
          </div>
        ))}

        <div className="rounded-2xl border border-night-borderLight bg-night-base/60 p-5">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-indigo-200">{passwordText.requirementsTitle}</span>
            <span className="text-fog-muted">
              {passwordText.strengthLabel} {passwordText.strength[form.strength]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <RequirementPill met={form.patternOk} label={passwordText.requirementPattern} />
            <RequirementPill met={form.matchOk} label={passwordText.requirementMatch} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-fog-muted">
          <Link to={ROUTES.findPassword} className="flex items-center gap-2 hover:text-white">
            <i className="fa-regular fa-circle-question text-mercury-light" />
            {passwordText.forgot}
          </Link>
          <span>{passwordText.forgotNote}</span>
        </div>

        {form.error?.field === 'form' && <FieldStatusMessage tone="error" message={form.error.message} />}

        <FormActions
          submitLabel={form.submitting ? passwordText.submitting : passwordText.submit}
          submitIcon="fa-shield-halved"
          disabled={!form.canSubmit}
        />
      </form>
    </AccountShell>
  );
};

export default PasswordChangePage;
