import { useEffect } from 'react';

/** key 가 바뀔 때(예: 푸터에서 다른 안내 문서로 이동) 페이지 맨 위로 스크롤합니다. */
export function useScrollTopOnChange(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [key]);
}
