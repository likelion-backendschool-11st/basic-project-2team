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
  const verifyMsg =
    form.verify === 'ok'
      ? { tone: 'success' as const, message: passwordText.verifyOk }
      : form.verify === 'fail'
        ? { tone: 'error' as const, message: passwordText.verifyFail }
        : { tone: 'hint' as const, message: passwordText.verifyHint };

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
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <PasswordField
                  field={{ key: 'password', id: f.id, label: '', type: 'password', placeholder: f.placeholder, autoComplete: f.autoComplete }}
                  value={form.values[f.id]}
                  onChange={form.onChange(f.id)}
                  showLabel={passwordText.showLabel}
                  hideLabel={passwordText.hideLabel}
                />
              </div>
              {f.id === 'current' && (
                <button type="button" onClick={form.verifyCurrent} className="h-12 px-6 rounded-xl border border-night-borderLight text-sm font-semibold text-white hover:bg-white/5 flex items-center gap-2 shrink-0">
                  <i className="fa-regular fa-circle-check text-mercury-light" />
                  {passwordText.verifyButton}
                </button>
              )}
            </div>
            {f.id === 'current' && <FieldStatusMessage tone={verifyMsg.tone} message={verifyMsg.message} />}
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

        <FormActions submitLabel={passwordText.submit} submitIcon="fa-shield-halved" disabled={!form.canSubmit} />
      </form>
    </AccountShell>
  );
};

export default PasswordChangePage;
