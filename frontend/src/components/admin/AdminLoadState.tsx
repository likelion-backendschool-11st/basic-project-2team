import React from 'react';
import { adminText } from '../../data/adminData';

interface AdminLoadStateProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}

/** Placeholder card for detail pages while loading or after a failed request. */
export const AdminLoadState: React.FC<AdminLoadStateProps> = ({ loading, error, onRetry }) => (
  <div role={error ? 'alert' : 'status'} className="rounded-3xl border border-night-borderLight bg-night-surface p-12 text-center text-sm">
    {error ? (
      <>
        <p className="text-rose-300">{error}</p>
        <button type="button" onClick={onRetry} className="mt-4 h-10 px-5 rounded-xl border border-night-borderLight text-fog-sub hover:text-white hover:bg-white/5">{adminText.retry}</button>
      </>
    ) : (
      <p className="text-fog-muted">{loading ? adminText.loading : adminText.empty}</p>
    )}
  </div>
);

export default AdminLoadState;
