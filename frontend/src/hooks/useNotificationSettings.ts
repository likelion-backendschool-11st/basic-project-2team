import { useCallback, useEffect, useState } from 'react';
import { errorMessageOf } from '../api/http';
import { getGames, type Game } from '../api/gameApi';
import { addSubscription, deleteSubscription, getSubscriptions, setSubscriptionEnabled, toSubscriptionView } from '../api/notificationApi';
import { notificationText, type SubscriptionView } from '../data/notificationData';

/**
 * 관심 게임 알림 설정(GET·POST·PATCH·DELETE /api/notifications/subscriptions). 패널을 열었을 때(enabled) 불러옵니다.
 * 켜기·끄기는 화면을 먼저 바꾸고 서버 요청이 실패하면 되돌립니다.
 */
export function useNotificationSettings(enabled: boolean) {
  const [subscriptions, setSubscriptions] = useState<readonly SubscriptionView[]>([]);
  const [games, setGames] = useState<readonly Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gameCode, setGameCodeState] = useState('');
  const [detailCode, setDetailCode] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getSubscriptions(), getGames()])
      .then(([items, gameList]) => {
        setSubscriptions(items.map(toSubscriptionView));
        setGames(gameList);
        setLoaded(true);
      })
      .catch((err: unknown) => setError(errorMessageOf(err, notificationText.settingsLoadFailed)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (enabled && !loaded) load();
  }, [enabled, loaded, load]);

  const setGameCode = (code: string) => {
    setGameCodeState(code);
    setDetailCode('');
  };

  const selectedGame = games.find((g) => g.code === gameCode) ?? null;
  const detailOptions = selectedGame ? selectedGame.contents : [];

  const add = async () => {
    if (!gameCode || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addSubscription(gameCode, detailCode || null);
      setGameCodeState('');
      setDetailCode('');
      setSubscriptions((await getSubscriptions()).map(toSubscriptionView));
    } catch (err) {
      setError(errorMessageOf(err, notificationText.settingsSaveFailed));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (item: SubscriptionView) => {
    setError(null);
    setSubscriptions((prev) => prev.map((s) => (s.id === item.id ? { ...s, enabled: !item.enabled } : s)));
    setSubscriptionEnabled(item.id, !item.enabled).catch((err: unknown) => {
      setError(errorMessageOf(err, notificationText.settingsSaveFailed));
      setSubscriptions((prev) => prev.map((s) => (s.id === item.id ? { ...s, enabled: item.enabled } : s)));
    });
  };

  const remove = (item: SubscriptionView) => {
    setError(null);
    setSubscriptions((prev) => prev.filter((s) => s.id !== item.id));
    deleteSubscription(item.id).catch((err: unknown) => {
      setError(errorMessageOf(err, notificationText.settingsSaveFailed));
      load();
    });
  };

  return {
    subscriptions,
    games,
    detailOptions,
    loading,
    loaded,
    error,
    saving,
    gameCode,
    setGameCode,
    detailCode,
    setDetailCode,
    add,
    toggle,
    remove,
    reload: load,
  };
}
