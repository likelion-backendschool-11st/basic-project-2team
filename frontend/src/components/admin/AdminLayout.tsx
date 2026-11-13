import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import BrandLogo from '../layout/BrandLogo';
import { adminNav, adminText } from '../../data/adminData';
import { useAdminSession } from '../../hooks/useAdminSession';

interface AdminLayoutProps {
  readonly title?: string;
  readonly description?: string;
  readonly back?: { readonly to: string; readonly label: string };
  readonly badge?: React.ReactNode;
  readonly children: React.ReactNode;
}

/** Shell for every admin page: top bar, side nav, heading, footer. Sends signed-out admins to the admin login. */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ title, description, back, badge, children }) => {
  const { admin, logout } = useAdminSession();
  return (
    <div className="min-h-screen flex flex-col bg-night-base text-fog-headline">
      <header className="h-[70px] border-b border-night-borderLight px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="text-[11px] px-2 py-1 rounded-md bg-night-card text-fog-sub border border-night-borderLight">{adminText.tag}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {admin && <span className="hidden sm:flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-night-card text-[11px] flex items-center justify-center">AD</span>{admin.name}<span className="text-xs text-fog-muted">({admin.role})</span></span>}
          <button type="button" onClick={logout} className="px-4 py-2 rounded-full border border-night-borderLight text-sm hover:bg-white/5">{adminText.logout}</button>
        </div>
      </header>
      <div className="flex-1 flex flex-col md:flex-row">
        <nav aria-label="관리자 메뉴" className="md:w-60 shrink-0 md:border-r border-night-borderLight p-4 flex md:flex-col gap-1 overflow-x-auto">
          {adminNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={'end' in n} className={({ isActive }) => `px-4 py-3 rounded-full text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-night-card text-white font-semibold' : 'text-fog-sub hover:text-white hover:bg-white/5'}`}>{n.label}</NavLink>
          ))}
        </nav>
        <main className="flex-1 min-w-0 p-6 md:p-10 max-w-[1280px]">
          {back && <Link to={back.to} className="text-sm text-indigo-300 hover:text-indigo-200 flex items-center gap-2 mb-3"><i className="fa-solid fa-arrow-left text-xs" />{back.label}</Link>}
          {title && (
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">{title}{badge}</h1>
              {description && <p className="text-sm text-fog-sub mt-2">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
      <footer className="border-t border-night-borderLight px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-fog-muted">
        <span><b className="text-fog-headline">{adminText.footer}</b> · {adminText.terms} · {adminText.privacy}</span>
        <span>{adminText.copy}</span>
      </footer>
    </div>
  );
};

export default AdminLayout;
