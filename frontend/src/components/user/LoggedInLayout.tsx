import React from 'react';
import AppLayout from '../layout/AppLayout';
import UserHeaderSlot from './UserHeaderSlot';
import { currentUser } from '../../data/userData';

interface LoggedInLayoutProps {
  readonly children: React.ReactNode;
  readonly contained?: boolean;
}

/** AppLayout with the logged-in user pill + logout in the header. */
export const LoggedInLayout: React.FC<LoggedInLayoutProps> = ({ children, contained = true }) => (
  <AppLayout headerRightSlot={<UserHeaderSlot user={currentUser} />} contained={contained}>
    {children}
  </AppLayout>
);

export default LoggedInLayout;
