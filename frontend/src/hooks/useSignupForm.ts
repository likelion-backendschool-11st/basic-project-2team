import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAvailability, signup } from '../api/authApi';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { ROUTES } from '../data/routes';
import {
  agreementTermIds,
  checkMessages,
  checkRequiredMessages,
  duplicateErrorFields,
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

/** 중복 확인 결과. value 는 확인한 시점의 입력값이라, 이후 입력이 바뀌면 결과가 무효(idle)가 됩니다. */
interface CheckResult {
  readonly status: CheckStatus;
  readonly value: string;
  /** 서버가 알려준 형식 오류·실패 문구 (없으면 checkMessages 의 기본 문구) */
  readonly message?: string;
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

const checkKeys: readonly DuplicateCheckKey[] = ['userId', 'nickname', 'email'];

export function useSignupForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupValues>(initialValues);
  const [checkResults, setCheckResults] = useState<Partial<Record<DuplicateCheckKey, CheckResult>>>({});
  const [agreed, setAgreed] = useState<Readonly<Record<string, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setCheckResult = (key: DuplicateCheckKey, result: CheckResult) =>
    setCheckResults((prev) => ({ ...prev, [key]: result }));

  /** 지금 입력값 기준의 확인 상태 */
  const checkStatusOf = (key: DuplicateCheckKey): CheckStatus => {
    const result = checkResults[key];
    return result && result.value === values[key].trim() ? result.status : 'idle';
  };

  const checkMessageOf = (key: DuplicateCheckKey) => {
    const status = checkStatusOf(key);
    return (status !== 'idle' && checkResults[key]?.message) || checkMessages[key][status];
  };

  const checks = Object.fromEntries(checkKeys.map((key) => [key, checkStatusOf(key)])) as Readonly<
    Record<DuplicateCheckKey, CheckStatus>
  >;

  const onFieldChange = (key: SignupFieldKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  /** GET /api/auth/check — 형식이 틀리면 서버가 400 과 함께 이유를 알려줍니다. */
  const runDuplicateCheck = async (key: DuplicateCheckKey) => {
    const value = values[key].trim();
    if (!value) {
      setCheckResult(key, { status: 'empty', value });
      return;
    }
    setCheckResult(key, { status: 'checking', value });
    try {
      const { available } = await checkAvailability(key, value);
      setCheckResult(key, { status: available ? 'available' : 'taken', value });
    } catch (err) {
      setCheckResult(key, { status: 'invalid', value, message: errorMessageOf(err, signupText.checkFailed) });
    }
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

  /** 화면에서 확인할 수 있는 오류 문구 (없으면 null) */
  const validate = (): string | null => {
    for (const key of checkKeys) {
      const status = checkStatusOf(key);
      if (status === 'available') continue;
      return status === 'idle' || status === 'empty' || status === 'checking'
        ? checkRequiredMessages[key]
        : checkMessageOf(key);
    }
    if (values.password !== values.passwordConfirm) return signupText.errorPasswordMismatch;
    if (termItems.some((t) => t.required && !agreed[t.id])) return signupText.errorRequiredTerms;
    return null;
  };

  /** POST /api/auth/signup — 성공하면 가입 완료 화면으로 닉네임을 넘깁니다. */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const invalid = validate();
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitting(true);
    try {
      const result = await signup({
        name: values.name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        userId: values.userId.trim(),
        nickname: values.nickname.trim(),
        password: values.password,
        email: values.email.trim(),
        agreements: {
          terms: Boolean(agreed[agreementTermIds.terms]),
          privacy: Boolean(agreed[agreementTermIds.privacy]),
          marketing: Boolean(agreed[agreementTermIds.marketing]),
        },
      });
      const state: SignupCompleteState = { nickname: result.nickname };
      navigate(ROUTES.signupComplete, { state });
    } catch (err) {
      // 확인 이후 다른 사람이 먼저 가입한 경우: 해당 필드를 '사용 중' 으로 되돌립니다.
      const duplicateKey = err instanceof ApiRequestError ? duplicateErrorFields[err.code] : undefined;
      if (duplicateKey) setCheckResult(duplicateKey, { status: 'taken', value: values[duplicateKey].trim() });
      setSubmitError(errorMessageOf(err, signupText.errorFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    values,
    checks,
    checkMessageOf,
    agreed,
    allAgreed,
    passwordMismatch,
    passwordMatch,
    submitError,
    submitting,
    onFieldChange,
    runDuplicateCheck,
    toggleTerm,
    toggleAll,
    onSubmit,
  };
}
