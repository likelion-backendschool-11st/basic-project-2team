import React from 'react';
import AppLayout from '../layout/AppLayout';

interface AuthPageShellProps {
  readonly children: React.ReactNode;
  /** Tailwind max-width class for the centered column. */
  readonly maxWidthClassName?: string;
}

/** Full-bleed auth backdrop: shared header/footer, ambient glows, centered column. */
export const AuthPageShell: React.FC<AuthPageShellProps> = ({ children, maxWidthClassName = 'max-w-md' }) => (
  <AppLayout contained={false} showNav={false}>
    <div className="relative flex-1 flex flex-col w-full items-center justify-center py-12 px-4 md:px-8 overflow-hidden bg-night-deep isolate">
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[580px] h-[340px] bg-mercury/10 rounded-full blur-[120px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-1/4 w-[420px] h-[260px] bg-periwinkle/10 rounded-full blur-[100px] pointer-events-none -z-10"
      />
      <div className={`w-full ${maxWidthClassName} flex flex-col items-center`}>{children}</div>
    </div>
  </AppLayout>
);

export default AuthPageShell;
