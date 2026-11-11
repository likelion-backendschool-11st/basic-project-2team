import React from 'react';

interface ToastProps {
  readonly message: string | null;
  readonly icon?: string;
}

/** Bottom-right notice; pair with useToast. */
export const Toast: React.FC<ToastProps> = ({ message, icon = 'fa-circle-check' }) =>
  message ? (
    <div role="status" className="fixed bottom-6 right-6 z-[110] flex items-center gap-2.5 rounded-xl border border-night-borderLight bg-night-card px-4 py-3 text-sm text-white shadow-2xl">
      <i className={`fa-solid ${icon} text-emeraldAccent`} />
      {message}
    </div>
  ) : null;

export default Toast;
