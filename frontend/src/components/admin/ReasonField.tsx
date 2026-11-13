import React from 'react';

interface ReasonFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly maxLength: number;
  readonly placeholder?: string;
  readonly error?: string | null;
  readonly required?: boolean;
  readonly rows?: number;
}

const box = 'rounded-xl border border-night-borderLight bg-night-base';

/** Labeled textarea with a character counter — 삭제·처리 사유 inputs. */
export const ReasonField: React.FC<ReasonFieldProps> = ({ label, value, onChange, maxLength, placeholder, error, required = true, rows = 4 }) => (
  <div className="w-full text-left">
    <label className="block text-xs font-semibold text-fog-sub">
      <span className="flex justify-between gap-2">
        <span>{label} {required && <span className="text-rose-300">(필수)</span>}</span>
        <span className="font-normal text-fog-muted">{value.length}/{maxLength}</span>
      </span>
      <textarea value={value} maxLength={maxLength} rows={rows} placeholder={placeholder} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} className={`${box} mt-2 w-full p-3 text-sm text-fog-headline resize-none focus:border-mercury focus:ring-0`} />
    </label>
    {error && <p role="alert" className="text-xs text-rose-300 mt-1">{error}</p>}
  </div>
);

export default ReasonField;
