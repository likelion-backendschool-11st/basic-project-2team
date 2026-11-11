import React, { type ChangeEvent } from 'react';
import type { SignupFieldConfig } from '../../data/signupData';
import { inputBaseClass, labelClass } from './fieldStyles';

interface TextFieldProps {
  readonly field: SignupFieldConfig;
  readonly value: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const TextField: React.FC<TextFieldProps> = ({ field, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className={labelClass} htmlFor={field.id}>
      {field.label}
    </label>
    <input
      className={inputBaseClass}
      id={field.id}
      type={field.type}
      placeholder={field.placeholder}
      autoComplete={field.autoComplete}
      value={value}
      onChange={onChange}
    />
  </div>
);

export default TextField;
