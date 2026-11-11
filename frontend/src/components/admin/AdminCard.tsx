import React from 'react';

interface AdminCardProps {
  readonly title?: React.ReactNode;
  readonly aside?: React.ReactNode;
  readonly className?: string;
  readonly children: React.ReactNode;
}

export const AdminCard: React.FC<AdminCardProps> = ({ title, aside, className = '', children }) => (
  <section className={`rounded-3xl border border-night-borderLight bg-night-surface p-6 ${className}`}>
    {title && <div className="flex items-center justify-between gap-3 mb-5"><h2 className="text-lg font-bold text-white flex items-center gap-2">{title}</h2>{aside}</div>}
    {children}
  </section>
);

/** Label / value rows used by the detail pages. */
export const InfoGrid: React.FC<{ readonly items: readonly (readonly [string, React.ReactNode])[]; readonly cols?: 1 | 2 }> = ({ items, cols = 2 }) => (
  <dl className={`grid gap-x-10 gap-y-3 text-sm ${cols === 2 ? 'md:grid-cols-2' : ''}`}>
    {items.map(([k, v]) => <div key={k} className="flex gap-6"><dt className="w-24 shrink-0 text-fog-muted">{k}</dt><dd className="text-white min-w-0 break-words">{v}</dd></div>)}
  </dl>
);

export default AdminCard;
