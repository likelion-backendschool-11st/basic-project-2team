import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { passwordText } from '../data/accountData';
import { ROUTES } from '../data/routes';

type Values = Readonly<Record<'current' | 'next' | 'confirm', string>>;
export type VerifyStatus = 'idle' | 'ok' | 'fail';

const PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/;

export function usePasswordChangeForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>({ current: '', next: '', confirm: '' });
  const [verify, setVerify] = useState<VerifyStatus>('idle');

  const onChange = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === 'current') setVerify('idle');
  };

  const verifyCurrent = () => setVerify(values.current === passwordText.mockCurrent ? 'ok' : 'fail');

  const patternOk = PATTERN.test(values.next);
  const matchOk = values.confirm.length > 0 && values.next === values.confirm;
  const strength = useMemo(() => {
    if (!values.next) return 0;
    if (!patternOk) return 1;
    return values.next.length >= 12 ? 3 : 2;
  }, [values.next, patternOk]);

  const canSubmit = verify === 'ok' && patternOk && matchOk;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) navigate(ROUTES.myPage);
  };

  return { values, verify, patternOk, matchOk, strength, canSubmit, onChange, verifyCurrent, onSubmit };
}
