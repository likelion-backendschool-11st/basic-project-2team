import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface AppLayoutProps {
  readonly children: React.ReactNode;
  readonly showNav?: boolean;
  /** Wrap children in the standard 1520px main container. Set false for full-bleed pages (auth screens). */
  readonly contained?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, showNav = true, contained = true }) => (
  <div className="min-h-screen flex flex-col bg-night-base">
    <Header showNav={showNav} />
    {contained ? (
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 lg:p-6">{children}</main>
    ) : (
      <main className="flex-1 flex flex-col">{children}</main>
    )}
    <Footer />
  </div>
);

export default AppLayout;
