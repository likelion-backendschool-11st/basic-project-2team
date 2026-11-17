import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUserJson, type LoginUser } from '../api/authApi';
import { ApiRequestError, errorMessageOf, hasAccessToken } from '../api/http';
import { promptLogin } from '../api/loginPrompt';
import { notifyNotificationsChanged } from '../api/notificationApi';
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
  kickParticipant,
  removeScrap,
  reportPost,
} from '../api/postApi';
import { getPostDetail, toHostProfile, toPostDetail, type PostDetailResponse } from '../api/postDetailApi';
import { postDetailText, postText, type ApplicationStatus, type HostProfile, type Participant, type PostDetail, type PostStatus, type RelatedPost } from '../data/postData';
import { paths, ROUTES } from '../data/routes';
import { useModal } from './useModal';
import { useToast } from './useToast';

/** 조회 기록을 나누는 조회자: 로그인했으면 회원 id, 아니면 guest */
function currentViewer() {
  try {
    const json = getStoredUserJson();
    return json ? String((JSON.parse(json) as LoginUser).id) : 'guest';
  } catch {
    return 'guest';
  }
}

/** 이 탭에서 처음 보는 조회 기록 키인지 확인하며 표시해 둡니다(sessionStorage, 탭을 닫으면 초기화). */
function markViewed(key: string) {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch {
    // 저장소를 못 쓰면 매번 셉니다.
  }
  return true;
}

/** 조회수를 올리는 중인 요청 (키: 조회 기록 키) */
const countingRequests = new Map<string, Promise<PostDetailResponse>>();

/**
 * 공고 상세를 처음 열 때 불러옵니다. 이 탭에서 지금 조회자(회원별, 비로그인은 guest)가 처음 여는 공고일 때만 조회수를 올려
 * 새로고침·다시 방문으로는 오르지 않게 하고, 같은 탭에서 계정을 바꿔 열면 그 계정의 조회로 셉니다.
 * 개발 모드(StrictMode)에서 effect 가 두 번 실행돼도 조회수를 올리는 요청은 하나만 보내고, 두 실행 모두 그 응답(오른 뒤의 조회수)을 씁니다.
 */
function openPostDetail(postId: string) {
  const key = `viewed:${currentViewer()}:${postId}`;
  const pending = countingRequests.get(key);
  if (pending) return pending;
  if (!markViewed(key)) return getPostDetail(postId, false);
  const request = getPostDetail(postId, true).finally(() => countingRequests.delete(key));
  countingRequests.set(key, request);
  return request;
}

export type PartyState = 'open' | 'paused' | 'closed';

export interface Applicant {
  /** 신청 id */
  readonly id: number;
  /** 신청한 회원 id (프로필 링크) */
  readonly memberId: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly spec: string;
  readonly mannerTemp: number;
  readonly reviewCount: number;
  /** 대표 평가 태그 라벨 (#친절함 …) */
  readonly topTags: readonly string[];
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
  /** 공대장 프로필 카드용 작성자 공개 프로필 (불러오기 전·실패 시 null — 카드는 해당 줄을 비워 둡니다) */
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [applicants, setApplicants] = useState<readonly Applicant[]>([]);
  const [participants, setParticipants] = useState<readonly Participant[]>([]);
  /** 추방 확인 창에 띄울 파티원 (창이 닫혀 있으면 null) */
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  /** 추방 확인 창에 적는 사유 (선택, 추방 알림·안내 모달에 실림) */
  const [kickReason, setKickReason] = useState('');
  const toast = useToast();
  const applicantsDialog = useModal(false);
  const remove = useModal(false);
  const disband = useModal(false);
  const leave = useModal(false);
  const closeRecruit = useModal(false);
  const reportDialog = useModal(false);
  /** 직전에 불러온 내 신청 상태. 화면을 연 채로 ACCEPTED → KICKED 가 되면 추방 안내(KickedNoticeHost)를 바로 확인시킵니다. */
  const lastStatus = useRef<ApplicationStatus | null>(null);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    // 처음 열 때만 조회수를 올리고(openPostDetail), 이후 다시 불러오기(자동 갱신 · 버튼 동작 뒤)는 올리지 않습니다.
    (version === 0 ? openPostDetail(postId) : getPostDetail(postId, false))
      .then((res) => {
        if (cancelled) return;
        const next = toPostDetail(res);
        // 실시간 신호로 추방을 알아채면, 추방 안내(useKickedNotice)의 5초 확인 주기를 기다리지 않고 바로 확인하게 합니다.
        if (lastStatus.current === 'ACCEPTED' && next.applicationStatus === 'KICKED') notifyNotificationsChanged();
        lastStatus.current = next.applicationStatus;
        setDetail(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 갱신 중 공고가 삭제됐으면 화면을 오류 안내로 바꾸고, 일시적인 네트워크 오류는 이전 화면을 유지합니다.
        if (err instanceof ApiRequestError && err.status === 404) setDetail(null);
        setError(err instanceof ApiRequestError ? err.message : postDetailText.loadFailed);
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
            memberId: a.applicant.id,
            name: a.applicant.nickname,
            avatarUrl: a.applicant.avatarUrl,
            spec: [`Lv.${a.applicant.level}`, a.role, a.message].filter(Boolean).join(' · '),
            mannerTemp: a.applicant.mannerTemp,
            reviewCount: a.applicant.reviewCount,
            topTags: (a.applicant.topTags ?? []).map((tag) => tag.label),
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
        setParticipants(
          items.map((p) => ({
            id: p.id,
            name: p.nickname,
            avatarUrl: p.avatarUrl,
            role: p.isHost ? postDetailText.leaderRole : (p.role ?? postDetailText.slotRole),
            leader: p.isHost,
            level: p.level,
            mannerTemp: p.mannerTemp,
          })),
        );
      })
      .catch(() => !cancelled && setParticipants([]));
    return () => {
      cancelled = true;
    };
  }, [postId, version]);

  // 파티원 화면: 공대장 프로필 카드에 보일 작성자의 공개 프로필과, 이미 즐겨찾기했는지(비로그인이면 viewer 가 없어 false).
  useEffect(() => {
    if (isOwner || hostId === undefined) return;
    let cancelled = false;
    setHostProfile(null);
    getMemberProfile(hostId)
      .then((p) => {
        if (cancelled) return;
        setHostProfile(toHostProfile(p));
        setFollowing(p.viewer?.favorited ?? false);
      })
      .catch(() => !cancelled && setFollowing(false));
    return () => {
      cancelled = true;
    };
  }, [isOwner, hostId]);

  /** API 호출 → 성공 문구 → 상세 다시 불러오기. 실패하면 서버 문구를 토스트로 보여줍니다(401 은 로그인 안내 모달이 대신 뜹니다). */
  const run = async (action: () => Promise<unknown>, success: string, { refresh = true } = {}) => {
    try {
      await action();
      toast.show(success);
      if (refresh) reload();
      return true;
    } catch (err) {
      toast.show(errorMessageOf(err, postText.actionFailed));
      return false;
    }
  };

  const scrapped = detail?.scrapped ?? false;
  const toggleScrap = () => run(() => (scrapped ? removeScrap(postId) : addScrap(postId)), scrapped ? postText.scrapRemoved : postText.scrapAdded);
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
    toast.show(postText.linkCopied);
  };

  const reported = detail?.reported ?? false;
  // 신고 창을 다 채운 뒤에 로그인 안내가 뜨지 않도록 창을 열기 전에 확인합니다.
  const askReport = () => (hasAccessToken() ? reportDialog.open() : promptLogin());
  const confirmReport = async (reason: string, detail = '') => {
    reportDialog.close();
    try {
      await reportPost(postId, reason, detail.trim() || undefined);
      toast.show(postText.reportedToast);
      reload();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ALREADY_REPORTED') reload();
      toast.show(errorMessageOf(err, postText.actionFailed));
    }
  };

  const apply = () => run(() => applyToPost(postId), postText.applySuccess);
  // 수락(ACCEPTED)된 뒤에는 「파티 탈퇴」, 아직 대기(PENDING) 중이면 「신청 취소」로 구분합니다.
  const accepted = detail?.applicationStatus === 'ACCEPTED';
  const confirmLeave = async () => {
    leave.close();
    await run(() => cancelApplication(postId), accepted ? postText.leftParty : postText.applyCanceled);
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

  // 공대장이 확정 파티원을 추방합니다. 추방된 회원의 신청은 탈퇴 상태가 되고, 그 회원 화면은 공고 이벤트로 새로고침 없이 바뀝니다.
  const askKick = (participant: Participant) => {
    setKickReason('');
    setKickTarget(participant);
  };
  const cancelKick = () => setKickTarget(null);
  const confirmKick = async () => {
    const target = kickTarget;
    setKickTarget(null);
    if (target?.id === undefined) return;
    const memberId = target.id;
    await run(() => kickParticipant(postId, memberId, kickReason.trim()), postText.kick.done(target.name));
  };

  const toggleFollow = async () => {
    if (hostId === undefined) return;
    const next = !following;
    if (await run(() => (next ? addFavorite(hostId) : removeFavorite(hostId)), next ? postText.followAdded : postText.followRemoved, { refresh: false })) setFollowing(next);
  };

  // 서버의 현재 인원(파티장 포함, 승인된 파티원만). 신청은 승인 전까지 인원에 들어가지 않습니다.
  const filled = detail?.current ?? 0;
  const state: PartyState = detail ? toPartyState(detail.status) : 'open';
  return {
    detail, loading, error, related, refresh: reload,
    applied: accepted || detail?.applicationStatus === 'PENDING', accepted,
    apply, scrapped, toggleScrap, copyLink, reported, askReport, confirmReport, reportDialog,
    hostProfile, following, toggleFollow, state, togglePause: () => setStatus(state === 'open' ? 'PAUSED' : 'OPEN'),
    applicants, resolveApplicant, applicantsDialog, participants, kickTarget, kickReason, setKickReason, askKick, cancelKick, confirmKick,
    filled, percent: detail ? Math.round((filled / detail.max) * 100) : 0, toast,
    remove, disband, leave, closeRecruit, confirmLeave, confirmRemove, confirmDisband, confirmClose,
  };
}
