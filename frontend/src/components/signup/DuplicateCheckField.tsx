import React, { type ChangeEvent } from 'react';
import type { CheckStatus, SignupFieldConfig } from '../../data/signupData';
import FieldStatusMessage, { type FieldStatusTone } from './FieldStatusMessage';
import { inputBaseClass, labelClass } from './fieldStyles';

interface DuplicateCheckFieldProps {
  readonly field: SignupFieldConfig;
  readonly value: string;
  readonly status: CheckStatus;
  readonly statusMessage: string;
  readonly buttonLabel: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly onCheck: () => void;
  /** Extra content rendered beside the status message (e.g. the email note). */
  readonly aside?: React.ReactNode;
}

const statusTone: Readonly<Record<CheckStatus, FieldStatusTone>> = {
  idle: 'hint',
  empty: 'error',
  checking: 'hint',
  available: 'success',
  taken: 'error',
  invalid: 'error',
};

export const DuplicateCheckField: React.FC<DuplicateCheckFieldProps> = ({
  field,
  value,
  status,
  statusMessage,
  buttonLabel,
  onChange,
  onCheck,
  aside,
}) => (
  <div className="flex flex-col gap-1">
    <label className={labelClass} htmlFor={field.id}>
      {field.label}
    </label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          className={`${inputBaseClass} ${status === 'available' ? 'bg-night-card' : ''}`}
          id={field.id}
          type={field.type}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          value={value}
          onChange={onChange}
        />
      </div>
      <button
        className="h-12 px-6 rounded-full bg-mercury text-white text-sm font-medium hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 shadow-sm"
        type="button"
        disabled={status === 'checking'}
        onClick={onCheck}
      >
        {buttonLabel}
      </button>
    </div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-0.5">
      <FieldStatusMessage tone={statusTone[status]} message={statusMessage} />
      {aside}
    </div>
  </div>
);

export default DuplicateCheckField;
