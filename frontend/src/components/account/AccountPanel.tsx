import React from 'react';
import { Link } from 'react-router-dom';
import { accountPanelText } from '../../data/accountData';
import { ROUTES } from '../../data/routes';

interface AccountPanelProps {
  readonly title: string;
  readonly description: string;
  readonly accent?: 'brand' | 'danger';
  readonly children: React.ReactNode;
}

/** Right column card: title + close button + body. */
export const AccountPanel: React.FC<AccountPanelProps> = ({ title, description, accent = 'brand', children }) => (
  <section className="flex-1 min-w-0 bg-night-surface border border-night-borderLight rounded-3xl shadow-card-subtle overflow-hidden">
    <header className="flex items-start justify-between gap-4 px-8 py-7 border-b border-night-borderLight">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {title}
          <span className={`w-2 h-2 rounded-full ${accent === 'danger' ? 'bg-roseAccent' : 'bg-mercury'}`} />
        </h1>
        <p className="text-sm text-fog-muted mt-1.5">{description}</p>
      </div>
      <Link to={ROUTES.myPage} aria-label={accountPanelText.closeLabel} className="text-fog-sub hover:text-white p-1 transition-colors">
        <i className="fa-solid fa-xmark text-xl" />
      </Link>
    </header>
    <div className="px-8 py-7">{children}</div>
  </section>
);

export default AccountPanel;
