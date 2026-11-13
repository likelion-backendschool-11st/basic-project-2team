import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../api/http';
import { getPostDetail, toPostDetail } from '../api/postDetailApi';
import { getRelatedPosts, postDetailText, postText, type PostDetail, type PostStatus } from '../data/postData';
import { ROUTES } from '../data/routes';
import { useModal } from './useModal';
import { useToast } from './useToast';

export type PartyState = 'open' | 'paused' | 'closed';

export interface Applicant {
  readonly name: string;
  readonly spec: string;
}

// 신청자 목록 API(GET /api/posts/{postId}/applications) 연동 전까지 쓰는 목 데이터
const initialApplicants: readonly Applicant[] = [
  { name: '홀리한빛', spec: '1625 홀리나이트 · 극신속' },
  { name: '붓끝의마법', spec: '1621 도화가 · 만개 풀세팅' },
];

const toPartyState = (status: PostStatus): PartyState => (status === 'OPEN' ? 'open' : 'closed');

/**
 * 공고 상세를 서버(GET /api/posts/{postId})에서 불러오고, 상세 화면의 버튼·다이얼로그 상태를 관리합니다.
 * 스크랩·참가 신청·모집 상태 변경·신청자 승인은 API 연동 전이라 화면 안에서만 바뀝니다.
 */
export function usePostDetail(postId: string) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const related = useMemo(() => getRelatedPosts(postId), [postId]);
  const [applied, setApplied] = useState(false);
  const [scrapped, setScrapped] = useState(false);
  const [following, setFollowing] = useState(false);
  const [state, setState] = useState<PartyState>('open');
  const [applicants, setApplicants] = useState(initialApplicants);
  const toast = useToast();
  const applicantsDialog = useModal(false);
  const remove = useModal(false);
  const disband = useModal(false);
  const leave = useModal(false);
  const closeRecruit = useModal(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPostDetail(postId)
      .then((res) => {
        if (cancelled) return;
        const next = toPostDetail(res);
        setDetail(next);
        setScrapped(next.scrapped);
        setApplied(next.applicationStatus === 'PENDING' || next.applicationStatus === 'ACCEPTED');
        setState(toPartyState(next.status));
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
  }, [postId]);

  const toggleScrap = () => {
    setScrapped((v) => !v);
    toast.show(scrapped ? postText.scrapRemoved : postText.scrapAdded);
  };
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
    toast.show(postText.linkCopied);
  };

  const confirmLeave = () => { leave.close(); setApplied(false); navigate(ROUTES.board); };
  const confirmRemove = () => { remove.close(); navigate(ROUTES.board); };
  const confirmDisband = () => { disband.close(); navigate(ROUTES.board); };
  const confirmClose = () => { closeRecruit.close(); setState('closed'); };

  const resolveApplicant = (name: string, accepted: boolean) => {
    setApplicants((prev) => prev.filter((a) => a.name !== name));
    toast.show(accepted ? `${name}님을 승인했습니다.` : `${name}님의 신청을 거절했습니다.`);
  };

  // 서버의 현재 인원(파티장 포함, 승인된 파티원만). 신청은 승인 전까지 인원에 들어가지 않습니다.
  const filled = detail?.current ?? 0;
  return {
    detail, loading, error, related, applied, apply: () => setApplied((v) => !v), scrapped, toggleScrap, copyLink,
    following, toggleFollow: () => setFollowing((v) => !v), state, setState,
    applicants, resolveApplicant, applicantsDialog,
    filled, percent: detail ? Math.round((filled / detail.max) * 100) : 0, toast,
    remove, disband, leave, closeRecruit, confirmLeave, confirmRemove, confirmDisband, confirmClose,
  };
}
