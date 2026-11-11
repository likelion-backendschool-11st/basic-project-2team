import React from 'react';
import { Link } from 'react-router-dom';
import type { AccountMenuItem } from '../../data/myPageData';
import { accountMenuStyles } from './mypageStyles';

interface AccountMenuProps {
  readonly title: string;
  readonly ariaLabel: string;
  readonly items: readonly AccountMenuItem[];
}

/** MyPage left sidebar: 프로필 수정 / 비밀번호 변경 / 회원 탈퇴. */
export const AccountMenu: React.FC<AccountMenuProps> = ({ title, ariaLabel, items }) => (
  <aside aria-label={ariaLabel} className="w-full md:w-56 shrink-0 flex flex-col gap-3">
    <div className="bg-night-surface border border-night-borderLight rounded-2xl p-4 shadow-sm flex flex-col gap-2.5">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">{title}</div>
      {items.map((item) => {
        const style = accountMenuStyles[item.variant];
        return (
          <React.Fragment key={item.id}>
            {item.dividerBefore && <div className="h-px bg-night-borderLight my-1" />}
            <Link
              to={item.to}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-all ${style.button}`}
            >
              <span className="flex items-center gap-2">
                <i className={`fa-solid ${item.icon} w-4 text-center text-xs ${style.icon}`} />
                {item.label}
              </span>
              {item.showChevron && <i className="fa-solid fa-chevron-right text-xs text-white/70" />}
            </Link>
          </React.Fragment>
        );
      })}
    </div>
  </aside>
);

export default AccountMenu;
