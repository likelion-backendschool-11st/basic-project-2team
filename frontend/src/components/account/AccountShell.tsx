import React from 'react';
import LoggedInLayout from '../user/LoggedInLayout';
import AccountSidebar from './AccountSidebar';
import AccountPanel from './AccountPanel';
import type { AccountNavItem } from '../../data/accountData';

interface AccountShellProps {
  readonly active: AccountNavItem['id'];
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}

/** Shared frame for 프로필 수정 / 비밀번호 변경 / 회원 탈퇴. */
export const AccountShell: React.FC<AccountShellProps> = ({ active, title, description, children }) => (
  <LoggedInLayout>
    <div className="flex flex-col lg:flex-row gap-6 py-4">
      <AccountSidebar active={active} />
      <AccountPanel title={title} description={description} accent={active === 'withdraw' ? 'danger' : 'brand'}>
        {children}
      </AccountPanel>
    </div>
  </LoggedInLayout>
);

export default AccountShell;
