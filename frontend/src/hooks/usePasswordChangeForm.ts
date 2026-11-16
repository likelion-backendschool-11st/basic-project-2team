import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { changePassword } from '../api/accountApi';
import { logout } from '../api/authApi';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { passwordText } from '../data/accountData';
import { PASSWORD_PATTERN } from '../data/authData';

type Values = Readonly<Record<'current' | 'next' | 'confirm', string>>;

/** 서버 오류를 어느 칸 아래에 보여줄지: 현재 비밀번호가 틀리면 current, 그 밖에는 폼 전체 */
interface SubmitError {
  readonly field: 'current' | 'form';
  readonly message: string;
}

export function usePasswordChangeForm() {
  const [values, setValues] = useState<Values>({ current: '', next: '', confirm: '' });
  const [error, setError] = useState<SubmitError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onChange = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const patternOk = PASSWORD_PATTERN.test(values.next);
  const matchOk = values.confirm.length > 0 && values.next === values.confirm;
  const strength = useMemo(() => {
    if (!values.next) return 0;
    if (!patternOk) return 1;
    return values.next.length >= 11 ? 3 : 2;
  }, [values.next, patternOk]);

  const canSubmit = values.current.length > 0 && patternOk && matchOk && !submitting && !done;

  /** PATCH /api/members/me/password — 성공하면 서버가 모든 Refresh Token 을 폐기하므로 이 브라우저도 로그아웃합니다. */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await changePassword(values.current, values.next);
      await logout();
      setValues({ current: '', next: '', confirm: '' });
      setDone(true);
    } catch (err) {
      const field = err instanceof ApiRequestError && err.code === 'INVALID_PASSWORD' ? 'current' : 'form';
      setError({ field, message: errorMessageOf(err, passwordText.failed) });
    } finally {
      setSubmitting(false);
    }
  };

  return { values, error, submitting, done, patternOk, matchOk, strength, canSubmit, onChange, onSubmit };
}
