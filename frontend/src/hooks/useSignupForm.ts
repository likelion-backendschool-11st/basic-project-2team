import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import {
  signupText,
  termItems,
  type CheckStatus,
  type DuplicateCheckKey,
  type SignupFieldKey,
} from '../data/signupData';

export type SignupValues = Readonly<Record<SignupFieldKey, string>>;

export interface SignupCompleteState {
  readonly nickname?: string;
}

const initialValues: SignupValues = {
  name: '',
  phone: '',
  address: '',
  userId: '',
  nickname: '',
  password: '',
  passwordConfirm: '',
  email: '',
};

const initialChecks: Readonly<Record<DuplicateCheckKey, CheckStatus>> = {
  userId: 'idle',
  nickname: 'idle',
  email: 'idle',
};

const isCheckKey = (key: SignupFieldKey): key is DuplicateCheckKey =>
  key === 'userId' || key === 'nickname' || key === 'email';

export function useSignupForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupValues>(initialValues);
  const [checks, setChecks] = useState(initialChecks);
  const [agreed, setAgreed] = useState<Readonly<Record<string, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onFieldChange = (key: SignupFieldKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [key]: value }));
    // Editing a checked field invalidates the previous duplicate check.
    if (isCheckKey(key)) setChecks((prev) => (prev[key] === 'idle' ? prev : { ...prev, [key]: 'idle' }));
    setSubmitError(null);
  };

  /** Simulated duplicate check (no backend): any non-empty value is available. */
  const runDuplicateCheck = (key: DuplicateCheckKey) => {
    setChecks((prev) => ({ ...prev, [key]: values[key].trim() ? 'available' : 'empty' }));
  };

  const passwordMismatch = values.passwordConfirm.length > 0 && values.password !== values.passwordConfirm;
  const passwordMatch = values.passwordConfirm.length > 0 && values.password === values.passwordConfirm;

  const allAgreed = useMemo(() => termItems.every((t) => agreed[t.id]), [agreed]);

  const toggleTerm = (id: string) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));
    setSubmitError(null);
  };

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreed(Object.fromEntries(termItems.map((t) => [t.id, next])));
    setSubmitError(null);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (termItems.some((t) => t.required && !agreed[t.id])) {
      setSubmitError(signupText.errorRequiredTerms);
      return;
    }
    if (values.password !== values.passwordConfirm) {
      setSubmitError(signupText.errorPasswordMismatch);
      return;
    }
    const state: SignupCompleteState = { nickname: values.nickname.trim() || undefined };
    navigate(ROUTES.signupComplete, { state });
  };

  return {
    values,
    checks,
    agreed,
    allAgreed,
    passwordMismatch,
    passwordMatch,
    submitError,
    onFieldChange,
    runDuplicateCheck,
    toggleTerm,
    toggleAll,
    onSubmit,
  };
}
