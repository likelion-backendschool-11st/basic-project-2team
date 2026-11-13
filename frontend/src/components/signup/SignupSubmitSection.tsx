import React from 'react';
import { Link } from 'react-router-dom';
import FieldStatusMessage from './FieldStatusMessage';

interface SignupSubmitSectionProps {
  readonly submitLabel: string;
  readonly haveAccountLabel: string;
  readonly loginLabel: string;
  readonly loginTo: string;
  readonly error?: string | null;
  readonly submitting?: boolean;
}

export const SignupSubmitSection: React.FC<SignupSubmitSectionProps> = ({
  submitLabel,
  haveAccountLabel,
  loginLabel,
  loginTo,
  error,
  submitting = false,
}) => (
  <div className="flex flex-col gap-4 pt-1">
    {error && (
      <div className="flex justify-center">
        <FieldStatusMessage tone="error" message={error} />
      </div>
    )}
    <button
      className="w-full h-14 rounded-full bg-mercury text-white text-base font-semibold shadow-lg shadow-mercury/25 hover:shadow-mercury/40 hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
      type="submit"
      disabled={submitting}
    >
      <span>{submitLabel}</span>
      <i className="fa-solid fa-arrow-right text-[16px] group-hover:translate-x-1 transition-transform" />
    </button>
    <div className="flex items-center justify-center gap-1 text-center">
      <span className="text-xs text-fog-sub">{haveAccountLabel}</span>
      <Link className="text-sm text-indigo-200 hover:text-white font-medium underline underline-offset-4 transition-colors" to={loginTo}>
        {loginLabel}
      </Link>
    </div>
  </div>
);

export default SignupSubmitSection;
