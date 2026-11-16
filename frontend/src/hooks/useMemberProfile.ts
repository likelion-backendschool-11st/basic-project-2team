import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { reportMember } from '../api/commentApi';
import { addFavorite, getMemberProfile, removeFavorite, type MemberProfileResponse } from '../api/mypageApi';
import { memberProfileText, profileText } from '../data/myPageData';
import { ROUTES } from '../data/routes';
import { useModal } from './useModal';
import { useToast } from './useToast';

/**
 * 다른 회원의 공개 프로필 (GET /api/members/{memberId}) + 즐겨찾기 토글.
 * 내 프로필 주소로 들어오면 마이페이지로 보냅니다. 비로그인이 즐겨찾기를 누르면 로그인 안내 모달이 뜹니다(api/http.ts).
 */
export function useMemberProfile(memberId: string | undefined) {
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<MemberProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);
  const reportDialog = useModal(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const id = Number(memberId);
    setProfile(null);
    setError(null);
    if (!Number.isInteger(id) || id < 1) {
      setError(memberProfileText.notFound);
      return;
    }
    let cancelled = false;
    getMemberProfile(id)
      .then((res) => {
        if (cancelled) return;
        if (res.viewer?.isMe) {
          navigate(ROUTES.myPage, { replace: true });
          return;
        }
        setProfile(res);
        setFavorited(res.viewer?.favorited ?? false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError && err.status === 404 ? memberProfileText.notFound : errorMessageOf(err, profileText.loadFailed));
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, navigate, reloadKey]);

  const toggleFavorite = async () => {
    if (!profile || pending) return;
    setPending(true);
    try {
      if (favorited) await removeFavorite(profile.id);
      else await addFavorite(profile.id);
      setFavorited(!favorited);
      toast.show(favorited ? memberProfileText.favoriteRemoved : memberProfileText.favoriteAdded);
    } catch (err) {
      toast.show(errorMessageOf(err, memberProfileText.actionFailed));
    } finally {
      setPending(false);
    }
  };

  /** 이 회원 신고. 같은 회원을 이미 신고했으면 서버 문구(409)를 그대로 안내합니다. */
  const report = async (reason: string, detail: string) => {
    if (!profile) return;
    reportDialog.close();
    try {
      await reportMember(profile.id, reason, detail.trim() || undefined);
      toast.show(memberProfileText.reported);
    } catch (err) {
      toast.show(errorMessageOf(err, memberProfileText.actionFailed));
    }
  };

  return { profile, error, favorited, pending, toggleFavorite, report, reportDialog, reload, toast };
}
