import React from 'react';
import { adminText, type SelectOption } from '../../data/adminData';

export const filterControl = 'w-full h-11 rounded-xl border border-night-borderLight bg-night-base px-3 text-sm text-fog-headline placeholder:text-fog-muted focus:border-mercury focus:ring-0';

export const FilterField: React.FC<{ readonly label: string; readonly className?: string; readonly children: React.ReactNode }> = ({ label, className = '', children }) => (
  <label className={`flex flex-col gap-1.5 text-xs font-semibold text-fog-sub ${className}`}>{label}{children}</label>
);

interface SelectFieldProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (v: string) => void;
  readonly all?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChange, all = '전체' }) => (
  <FilterField label={label}>
    <select className={filterControl} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{all}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </FilterField>
);

interface AdminFilterPanelProps {
  readonly onSearch: () => void;
  readonly onReset: () => void;
  readonly footer?: React.ReactNode;
  readonly children: React.ReactNode;
}

/** Filter card: Enter or "조회" applies, "초기화" clears. */
export const AdminFilterPanel: React.FC<AdminFilterPanelProps> = ({ onSearch, onReset, footer, children }) => (
  <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="rounded-3xl border border-night-borderLight bg-night-surface p-6 mb-6">
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div>{footer}</div>
      <div className="flex gap-2">
        <button type="button" onClick={onReset} className="h-11 px-6 rounded-xl border border-night-borderLight bg-night-card text-sm font-semibold hover:bg-white/10">{adminText.reset}</button>
        <button type="submit" className="h-11 px-7 rounded-xl bg-mercury text-sm font-bold text-white shadow-lg shadow-mercury/30 hover:bg-mercury-light">{adminText.search}</button>
      </div>
    </div>
  </form>
);

export default AdminFilterPanel;
