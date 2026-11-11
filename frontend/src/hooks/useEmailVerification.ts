import { useCallback, useEffect, useRef, useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailVerificationOptions {
  /** When set, the verified state resets after this many ms (find-id design behaviour). */
  readonly resetAfterMs?: number;
}

/** Simulated "확인" (verify) step for an email field. No backend. */
export function useEmailVerification({ resetAfterMs }: EmailVerificationOptions = {}) {
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const verify = useCallback(
    (email: string) => {
      if (!EMAIL_PATTERN.test(email.trim())) {
        setError(true);
        setVerified(false);
        return false;
      }
      setError(false);
      setVerified(true);
      if (resetAfterMs) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setVerified(false), resetAfterMs);
      }
      return true;
    },
    [resetAfterMs],
  );

  const reset = useCallback(() => {
    setVerified(false);
    setError(false);
  }, []);

  return { verified, error, verify, reset };
}
