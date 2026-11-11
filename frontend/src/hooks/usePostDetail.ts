import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPostDetail, getRelatedPosts, postText } from '../data/postData';
import { ROUTES } from '../data/routes';
import { useModal } from './useModal';
import { useToast } from './useToast';

export type PartyState = 'open' | 'paused' | 'closed';

export interface Applicant {
  readonly name: string;
  readonly spec: string;
}

const initialApplicants: readonly Applicant[] = [
  { name: '홀리한빛', spec: '1625 홀리나이트 · 극신속' },
  { name: '붓끝의마법', spec: '1621 도화가 · 만개 풀세팅' },
];

/** Everything the post page needs that isn't the comment thread. */
export function usePostDetail(postId: string) {
  const navigate = useNavigate();
  const detail = useMemo(() => getPostDetail(postId), [postId]);
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

  const filled = detail.current + (applied ? 1 : 0);
  return {
    detail, related, applied, apply: () => setApplied((v) => !v), scrapped, toggleScrap, copyLink,
    following, toggleFollow: () => setFollowing((v) => !v), state, setState,
    applicants, resolveApplicant, applicantsDialog,
    filled, percent: Math.round((filled / detail.max) * 100), toast,
    remove, disband, leave, closeRecruit, confirmLeave, confirmRemove, confirmDisband, confirmClose,
  };
}
