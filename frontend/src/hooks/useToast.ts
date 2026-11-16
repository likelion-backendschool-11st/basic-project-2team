import { useCallback, useEffect, useRef, useState } from 'react';
import { isLoginPromptOpen } from '../api/loginPrompt';

/** Show a message for `ms` then clear it. */
export function useToast(ms = 2400) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number>();

  const show = useCallback(
    (text: string) => {
      // 로그인 안내 모달이 떠 있으면 같은 실패를 알리는 토스트를 겹쳐 띄우지 않습니다.
      if (isLoginPromptOpen()) return;
      window.clearTimeout(timer.current);
      setMessage(text);
      timer.current = window.setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { message, show };
}
