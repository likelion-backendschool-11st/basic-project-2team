import React, { type ChangeEvent } from 'react';
import PasswordToggleButton from './PasswordToggleButton';
import { usePasswordVisibility } from '../../hooks/usePasswordVisibility';
import { passwordToggleLabels } from '../../data/authData';

interface AuthTextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly hint?: string;
  /** Font Awesome classes for the leading icon. */
  readonly icon?: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly autoComplete?: string;
  readonly required?: boolean;
  /** lg = login style (filled, 48px); md = recovery style (outlined, compact). */
  readonly size?: 'lg' | 'md';
  /** Element rendered to the right of the input (e.g. 확인 button). */
  readonly trailing?: React.ReactNode;
  readonly invalid?: boolean;
}

const inputBase = 'w-full text-fog-headline placeholder:text-fog-muted focus:outline-none focus:ring-0 transition-all';

export const AuthTextField: React.FC<AuthTextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  icon,
  type = 'text',
  autoComplete,
  required = true,
  size = 'md',
  trailing,
  invalid = false,
}) => {
  const { visible, toggle, inputType } = usePasswordVisibility();
  const isPassword = type === 'password';
  const resolvedType = isPassword ? inputType : type;
  const lg = size === 'lg';

  const padLeft = icon ? (lg ? 'pl-11' : 'pl-10') : 'pl-3.5';
  const padRight = isPassword ? (lg ? 'pr-11' : 'pr-10') : lg ? 'pr-4' : 'pr-3';
  const grow = trailing ? 'flex-1' : 'w-full';

  const wrapperClass = lg
    ? `relative flex items-center ${grow}`
    : `relative flex items-center ${grow} rounded-xl bg-night-deep border ${
        invalid ? 'border-roseAccent/70' : 'border-night-borderLight hover:border-fog-muted/50'
      } focus-within:border-mercury focus-within:ring-2 focus-within:ring-mercury/35 transition-all`;

  const inputClass = lg
    ? `${inputBase} h-12 ${padLeft} ${padRight} bg-night-deep border-0 rounded-2xl text-base shadow-inner focus:bg-night-card ${
        invalid ? 'ring-1 ring-roseAccent/60' : ''
      }`
    : `${inputBase} bg-transparent border-0 py-2.5 ${padLeft} ${padRight} text-sm`;

  const labelClass = lg
    ? 'text-sm text-fog-sub font-medium flex items-center justify-between'
    : 'flex items-center justify-between text-xs font-semibold text-fog-sub uppercase tracking-wider mb-1.5';

  return (
    <div className={`flex flex-col ${lg ? 'gap-1' : ''}`}>
      <label className={labelClass} htmlFor={id}>
        <span>{label}</span>
        {hint && <span className="text-xs text-fog-muted font-normal normal-case tracking-normal">{hint}</span>}
      </label>
      <div className={trailing ? 'flex gap-2' : 'flex'}>
        <div className={wrapperClass}>
          {icon && (
            <span
              className={`absolute inset-y-0 left-0 ${lg ? 'pl-4' : 'pl-3.5'} flex items-center pointer-events-none text-fog-muted`}
            >
              <i className={`${icon} ${lg ? 'text-base' : 'text-sm'}`} />
            </span>
          )}
          <input
            aria-invalid={invalid || undefined}
            autoComplete={autoComplete}
            className={inputClass}
            id={id}
            name={id}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            type={resolvedType}
            value={value}
          />
          {isPassword && <PasswordToggleButton label={passwordToggleLabels.show} onToggle={toggle} visible={visible} />}
        </div>
        {trailing}
      </div>
    </div>
  );
};

export default AuthTextField;
