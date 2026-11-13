import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { addFavorite, getMemberProfile, removeFavorite } from '../api/mypageApi';
import {
  addScrap,
  applyToPost,
  cancelApplication,
  changePostStatus,
  decideApplication,
  deletePost,
  getParticipants,
  getPendingApplications,
  getRelatedPosts,
  removeScrap,
} from '../api/postApi';
import { getPostDetail, toPostDetail } from '../api/postDetailApi';
import { postDetailText, postText, type Participant, type PostDetail, type PostStatus, type RelatedPost } from '../data/postData';
import { paths, ROUTES } from '../data/routes';
import { useModal } from './useModal';
import { useToast } from './useToast';

export type PartyState = 'open' | 'paused' | 'closed';

export interface Applicant {
  readonly id: number;
  readonly name: string;
  readonly spec: string;
}

const toPartyState = (status: PostStatus): PartyState => (status === 'OPEN' ? 'open' : status === 'PAUSED' ? 'paused' : 'closed');

/**
 * 공고 상세를 서버(GET /api/posts/{postId})에서 불러오고, 상세 화면의 버튼(스크랩 · 참가 신청/취소 · 모집 마감/재개 ·
 * 삭제/해산 · 신청자 승인/거절 · 작성자 즐겨찾기)을 각 API 에 연결합니다. 변경 후에는 상세를 다시 불러와 화면을 맞춥니다.
 */
export function usePostDetail(postId: string) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [related, setRelated] = useState<readonly RelatedPost[]>([]);
  const [following, setFollowing] = useState(false);
  const [applicants, setApplicants] = useState<readonly Applicant[]>([]);
  const [participants, setParticipants] = useState<readonly Participant[]>([]);
  const toast = useToast();
  const applicantsDialog = useModal(false);
  const remove = useModal(false);
  const disband = useModal(false);
  const leave = useModal(false);
  const closeRecruit = useModal(false);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    getPostDetail(postId)
      .then((res) => {
        if (cancelled) return;
        setDetail(toPostDetail(res));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : postDetailText.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, version]);

  // 관련 공고(같은 게임의 모집 중 공고)는 공고가 바뀔 때만 불러옵니다. 실패하면 목록을 비웁니다.
  useEffect(() => {
    let cancelled = false;
    getRelatedPosts(postId)
      .then((items) => {
        if (cancelled) return;
        setRelated(
          items.map((p) => ({
            id: String(p.id),
            game: p.gameName,
            title: p.title,
            meta: `${p.current}/${p.max}명`,
            state: p.max - p.current <= 1 ? '마감임박' : '모집중',
            to: paths.postDetail(String(p.id)),
          })),
        );
      })
      .catch(() => !cancelled && setRelated([]));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const isOwner = detail?.isOwner ?? false;
  const hostId = detail?.host.id;

  // 작성자 화면: 대기 중인 신청자 목록. 상세를 다시 불러올 때마다 함께 갱신합니다.
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    getPendingApplications(postId)
      .then((items) => {
        if (cancelled) return;
        setApplicants(
          items.map((a) => ({
            id: a.id,
            name: a.applicant.nickname,
            spec: [`Lv.${a.applicant.level}`, a.role, a.message].filter(Boolean).join(' · '),
          })),
        );
      })
      .catch(() => !cancelled && setApplicants([]));
    return () => {
      cancelled = true;
    };
  }, [postId, isOwner, version]);

  // 확정 파티원 명단(파티장 + 승인된 파티원). 승인·취소로 바뀔 수 있어 상세를 다시 불러올 때마다 함께 갱신합니다.
  useEffect(() => {
    let cancelled = false;
    getParticipants(postId)
      .then((items) => {
        if (cancelled) return;
        setParticipants(items.map((p) => ({ name: p.nickname, role: p.isHost ? postDetailText.leaderRole : (p.role ?? postDetailText.slotRole), leader: p.isHost })));
      })
      .catch(() => !cancelled && setParticipants([]));
    return () => {
      cancelled = true;
    };
  }, [postId, version]);

  // 파티원 화면: 작성자를 이미 즐겨찾기했는지. 비로그인이면 401 이라 false 로 둡니다.
  useEffect(() => {
    if (isOwner || hostId === undefined) return;
    let cancelled = false;
    getMemberProfile(hostId)
      .then((p) => !cancelled && setFollowing(p.viewer?.favorited ?? false))
      .catch(() => !cancelled && setFollowing(false));
    return () => {
      cancelled = true;
    };
  }, [isOwner, hostId]);

  /** API 호출 → 성공 문구 → 상세 다시 불러오기. 실패하면 서버 문구(401 은 로그인 안내)를 토스트로 보여줍니다. */
  const run = async (action: () => Promise<unknown>, success: string, { refresh = true } = {}) => {
    try {
      await action();
      toast.show(success);
      if (refresh) reload();
      return true;
    } catch (err) {
      toast.show(err instanceof ApiRequestError && err.status === 401 ? postText.loginRequired : errorMessageOf(err, postText.actionFailed));
      return false;
    }
  };

  const scrapped = detail?.scrapped ?? false;
  const toggleScrap = () => run(() => (scrapped ? removeScrap(postId) : addScrap(postId)), scrapped ? postText.scrapRemoved : postText.scrapAdded);
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
    toast.show(postText.linkCopied);
  };

  const apply = () => run(() => applyToPost(postId), postText.applySuccess);
  const confirmLeave = async () => {
    leave.close();
    await run(() => cancelApplication(postId), postText.applyCanceled);
  };

  const leaveToBoard = async (done: string) => {
    if (await run(() => deletePost(postId), done, { refresh: false })) navigate(ROUTES.board);
  };
  const confirmRemove = () => {
    remove.close();
    return leaveToBoard(postText.deleted);
  };
  // 해산 API 는 따로 없어 공고를 삭제 처리합니다(신청자·파티원에게 삭제 알림이 갑니다).
  const confirmDisband = () => {
    disband.close();
    return leaveToBoard(postText.deleted);
  };

  const setStatus = (status: 'OPEN' | 'PAUSED' | 'CLOSED') =>
    run(() => changePostStatus(Number(postId), status), { OPEN: postText.reopened, PAUSED: postText.pausedDone, CLOSED: postText.closedDone }[status]);
  const confirmClose = () => {
    closeRecruit.close();
    return setStatus('CLOSED');
  };

  const resolveApplicant = (applicant: Applicant, accepted: boolean) =>
    run(
      () => decideApplication(postId, applicant.id, accepted ? 'ACCEPTED' : 'REJECTED'),
      accepted ? `${applicant.name}님을 승인했습니다.` : `${applicant.name}님의 신청을 거절했습니다.`,
    );

  const toggleFollow = async () => {
    if (hostId === undefined) return;
    const next = !following;
    if (await run(() => (next ? addFavorite(hostId) : removeFavorite(hostId)), next ? postText.followAdded : postText.followRemoved, { refresh: false })) setFollowing(next);
  };

  // 서버의 현재 인원(파티장 포함, 승인된 파티원만). 신청은 승인 전까지 인원에 들어가지 않습니다.
  const filled = detail?.current ?? 0;
  const state: PartyState = detail ? toPartyState(detail.status) : 'open';
  return {
    detail, loading, error, related,
    applied: detail?.applicationStatus === 'PENDING' || detail?.applicationStatus === 'ACCEPTED',
    apply, scrapped, toggleScrap, copyLink,
    following, toggleFollow, state, togglePause: () => setStatus(state === 'open' ? 'PAUSED' : 'OPEN'),
    applicants, resolveApplicant, applicantsDialog, participants,
    filled, percent: detail ? Math.round((filled / detail.max) * 100) : 0, toast,
    remove, disband, leave, closeRecruit, confirmLeave, confirmRemove, confirmDisband, confirmClose,
  };
}
