import React from 'react';
import AccountShell from '../components/account/AccountShell';
import AgreementCheck from '../components/account/AgreementCheck';
import FormActions from '../components/account/FormActions';
import { accountPanelText, withdrawAgreements, withdrawRows, withdrawText } from '../data/accountData';
import { useWithdrawForm } from '../hooks/useWithdrawForm';

interface WithdrawPageProps {
  readonly className?: string;
}

/** Stitch screen: "OurParty 마이페이지 - 회원 탈퇴하기 (디자인 시스템 적용)" (c2ea1f59ee454fd69e4253107319ed95) */
export const WithdrawPage: React.FC<WithdrawPageProps> = () => {
  const form = useWithdrawForm();
  const text = accountPanelText.withdraw;
  return (
    <AccountShell active="withdraw" title={text.title} description={text.description}>
      <div className="flex flex-col items-center text-center gap-3 pb-8">
        <div className="w-16 h-16 rounded-2xl bg-roseAccent/10 border border-roseAccent/30 flex items-center justify-center text-roseAccent text-2xl">
          <i className="fa-solid fa-circle-exclamation" />
        </div>
        <h2 className="text-2xl font-bold text-white">{withdrawText.heading}</h2>
        <p className="max-w-lg text-sm text-fog-muted leading-relaxed">{withdrawText.description}</p>
      </div>

      <div className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <i className="fa-solid fa-circle-info text-roseAccent" />
        {withdrawText.infoTitle}
      </div>
      <div className="rounded-2xl border border-night-borderLight divide-y divide-night-borderLight bg-night-base/60">
        {withdrawRows.map((r) => (
          <div key={r.id} className="grid grid-cols-[130px_1fr] gap-4 px-5 py-4 text-sm items-center">
            <span className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <i className={r.icon} />
              {r.label}
            </span>
            <span className="text-fog-headline">{r.body}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-night-borderLight divide-y divide-night-borderLight">
        {withdrawAgreements.map((a) => (
          <AgreementCheck key={a.id} title={a.title} note={a.note} checked={!!form.checked[a.id]} onToggle={() => form.toggle(a.id)} />
        ))}
      </div>

      <FormActions
        submitLabel={withdrawText.submit}
        submitIcon="fa-trash-can"
        danger
        disabled={!form.canWithdraw}
        onSubmit={form.withdraw}
        secondary={
          <button type="button" onClick={form.keep} className="h-12 px-7 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white hover:bg-white/5">
            {withdrawText.keep}
          </button>
        }
      />
    </AccountShell>
  );
};

export default WithdrawPage;
