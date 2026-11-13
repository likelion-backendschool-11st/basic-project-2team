import { useEffect, useState } from 'react';
import { errorMessageOf } from '../api/http';
import { getMyFavorites, removeFavorite, toFavoriteUser } from '../api/mypageApi';
import { favoritesText, type FavoriteUser } from '../data/myPageData';

/** 즐겨찾는 유저 목록과 해제 (GET·DELETE /api/members/me/favorites). 결과 안내는 notify 로 넘깁니다. */
export function useFavoriteUsers(notify: (message: string) => void) {
  const [users, setUsers] = useState<readonly FavoriteUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyFavorites()
      .then((items) => {
        if (!cancelled) setUsers(items.map(toFavoriteUser));
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

  const remove = async (user: FavoriteUser) => {
    try {
      await removeFavorite(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      notify(favoritesText.removed(user.name));
    } catch (err) {
      notify(errorMessageOf(err, favoritesText.removeFailed));
    }
  };

  return { users, loading, remove };
}
