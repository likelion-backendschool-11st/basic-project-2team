import React from 'react';
import AppLayout from '../layout/AppLayout';
import BoardUserMenu from './BoardUserMenu';

interface BoardLayoutProps {
  /** Search/filter panel rendered above the sidebar + table grid. */
  readonly panel: React.ReactNode;
  readonly sidebar: React.ReactNode;
  readonly children: React.ReactNode;
}

/** "통합 레이아웃 유지형" shell: shared header/footer + filter panel + 3/9 grid. */
export const BoardLayout: React.FC<BoardLayoutProps> = ({ panel, sidebar, children }) => (
  <AppLayout headerRightSlot={<BoardUserMenu />}>
    <div className="space-y-6">
      {panel}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {sidebar}
        <section className="lg:col-span-9 space-y-4">{children}</section>
      </div>
    </div>
  </AppLayout>
);

export default BoardLayout;
