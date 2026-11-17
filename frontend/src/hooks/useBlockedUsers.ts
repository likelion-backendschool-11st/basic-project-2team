import { useEffect, useState } from 'react';
import { errorMessageOf } from '../api/http';
import { getMyBlocks, removeBlock, toBlockedUser } from '../api/mypageApi';
import { blocksText, type BlockedUser } from '../data/myPageData';

/** 차단한 유저 목록과 차단 해제 (GET·DELETE /api/members/me/blocks). 결과 안내는 notify 로 넘깁니다. */
export function useBlockedUsers(notify: (message: string) => void) {
  const [users, setUsers] = useState<readonly BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyBlocks()
      .then((items) => {
        if (!cancelled) setUsers(items.map(toBlockedUser));
      })
      // 401 은 프로필 요약(useMyProfile)이 로그인 화면으로 보내므로 여기서는 빈 목록으로 둡니다.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (user: BlockedUser) => {
    try {
      await removeBlock(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      notify(blocksText.removed(user.name));
    } catch (err) {
      notify(errorMessageOf(err, blocksText.removeFailed));
    }
  };

  return { users, loading, remove };
}
