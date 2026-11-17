import { useState } from 'react';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { getMyPosts, isInvitablePost, toInvitablePost } from '../api/mypageApi';
import { invitePlayer } from '../api/postApi';
import { inviteText, type InvitablePost, type InviteTarget } from '../data/myPageData';

/** 초대할 공고를 고를 때 불러오는 내 공고 수 (API 최대 size) */
const MY_POST_FETCH_SIZE = 50;

/**
 * 「파티 초대」 모달 (마이페이지 최근 함께한 플레이어 · 공고 상세 댓글 작성자): 대상 플레이어를 정하면 모집 중인 내 공고를 불러오고,
 * 공고를 고르면 POST /api/posts/{postId}/invitations 로 초대합니다(상대는 알림함에서 참여·거절). 결과 안내는 notify 로 넘깁니다.
 */
export function usePartyInvite(notify: (message: string) => void) {
  const [target, setTarget] = useState<InviteTarget | null>(null);
  const [posts, setPosts] = useState<readonly InvitablePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingPostId, setSendingPostId] = useState<number | null>(null);
  /** 이 화면에서 이미 초대를 보낸 `회원id:공고id` */
  const [invited, setInvited] = useState<ReadonlySet<string>>(() => new Set());

  const open = (player: InviteTarget) => {
    setTarget({ id: player.id, name: player.name });
    setPosts([]);
    setError(null);
    setLoading(true);
    getMyPosts(1, MY_POST_FETCH_SIZE)
      .then((page) => setPosts(page.items.filter(isInvitablePost).map(toInvitablePost)))
      .catch((err) => setError(errorMessageOf(err, inviteText.loadFailed)))
      .finally(() => setLoading(false));
  };

  const close = () => {
    if (sendingPostId !== null) return;
    setTarget(null);
  };

  const isInvited = (postId: number) => target !== null && invited.has(`${target.id}:${postId}`);

  const invite = async (postId: number) => {
    if (!target || sendingPostId !== null || isInvited(postId)) return;
    setSendingPostId(postId);
    const markInvited = () => setInvited((prev) => new Set(prev).add(`${target.id}:${postId}`));
    try {
      await invitePlayer(postId, target.id);
      markInvited();
      notify(inviteText.done(target.name));
    } catch (err) {
      // 이미 응답을 기다리는 초대가 있으면 버튼도 「초대 완료」로 바꿉니다.
      if (err instanceof ApiRequestError && err.code === 'ALREADY_INVITED') markInvited();
      notify(errorMessageOf(err, inviteText.failed));
    } finally {
      setSendingPostId(null);
    }
  };

  return {
    target,
    isOpen: target !== null,
    posts,
    loading,
    error,
    sendingPostId,
    isInvited,
    open,
    close,
    invite: (postId: number) => void invite(postId),
  };
}
