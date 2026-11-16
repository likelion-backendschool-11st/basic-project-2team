import { useCallback, useState } from 'react';
import { ApiRequestError } from '../api/http';

/** 서버가 욕설 때문에 거절할 때 보내는 오류 코드 (backend/src/common/profanityFilter.js) */
export const PROFANITY_ERROR_CODE = 'PROFANITY_DETECTED';

/**
 * 욕설 경고 모달 상태. `catches(err)` 는 욕설 오류면 모달에 띄울 문구를 저장하고 true 를 돌려줍니다
 * (그 오류는 토스트·인라인 오류로 또 보여주지 않도록 호출한 쪽에서 처리를 끝냅니다).
 */
export function useProfanityNotice() {
  const [message, setMessage] = useState<string | null>(null);
  const catches = useCallback((err: unknown) => {
    if (!(err instanceof ApiRequestError) || err.code !== PROFANITY_ERROR_CODE) return false;
    setMessage(err.fields.map((f) => f.message).join('\n') || err.message);
    return true;
  }, []);
  const close = useCallback(() => setMessage(null), []);
  return { message, catches, close };
}
