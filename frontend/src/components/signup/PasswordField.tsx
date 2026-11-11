import React, { type ChangeEvent } from 'react';
import type { SignupFieldConfig } from '../../data/signupData';
import { useSignupPasswordToggle } from '../../hooks/useSignupPasswordToggle';
import { inputBaseClass, labelClass } from './fieldStyles';

interface PasswordFieldProps {
  readonly field: SignupFieldConfig;
  readonly value: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly showLabel: string;
  readonly hideLabel: string;
  /** Helper content below the input (guide text, match status). */
  readonly children?: React.ReactNode;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({ field, value, onChange, showLabel, hideLabel, children }) => {
  const { visible, toggle } = useSignupPasswordToggle();
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass} htmlFor={field.id}>
        {field.label}
      </label>
      <div className="relative">
        <input
          className={`${inputBaseClass} pr-12`}
          id={field.id}
          type={visible ? 'text' : 'password'}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          value={value}
          onChange={onChange}
        />
        <button
          className="absolute right-3.5 top-3 w-6 h-6 flex items-center justify-center text-fog-muted hover:text-fog-headline transition-colors"
          type="button"
          onClick={toggle}
          aria-label={visible ? hideLabel : showLabel}
        >
          <i className={`fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'} text-[16px]`} />
        </button>
      </div>
      {children}
    </div>
  );
};

export default PasswordField;
