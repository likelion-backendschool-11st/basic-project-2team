import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { withdrawAgreements } from '../data/accountData';
import { ROUTES } from '../data/routes';

export function useWithdrawForm() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Readonly<Record<string, boolean>>>({});

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const canWithdraw = withdrawAgreements.every((a) => checked[a.id]);

  const withdraw = () => canWithdraw && navigate(ROUTES.home);
  const keep = () => navigate(ROUTES.myPage);

  return { checked, toggle, canWithdraw, withdraw, keep };
}
