import React from 'react';
import { Link } from 'react-router-dom';
import { accountPanelText } from '../../data/accountData';
import { ROUTES } from '../../data/routes';

interface FormActionsProps {
  readonly submitLabel: string;
  readonly submitIcon: string;
  readonly disabled?: boolean;
  /** Replace the default "취소" link (back to MyPage). */
  readonly secondary?: React.ReactNode;
  readonly danger?: boolean;
  readonly onSubmit?: () => void;
}

/** Bottom action row: cancel link + primary submit. */
export const FormActions: React.FC<FormActionsProps> = ({ submitLabel, submitIcon, disabled, secondary, danger, onSubmit }) => (
  <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-night-borderLight">
    {secondary ?? (
      <Link to={ROUTES.myPage} className="h-12 px-7 inline-flex items-center rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white hover:bg-white/5 transition-colors">
        {accountPanelText.cancel}
      </Link>
    )}
    <button
      type={onSubmit ? 'button' : 'submit'}
      onClick={onSubmit}
      disabled={disabled}
      className={`h-12 px-7 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:pointer-events-none ${
        danger ? 'bg-roseAccent/80 hover:bg-roseAccent' : 'bg-mercury hover:bg-mercury-light shadow-lg shadow-mercury/30'
      }`}
    >
      <i className={`fa-solid ${submitIcon}`} />
      {submitLabel}
    </button>
  </div>
);

export default FormActions;
