import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptReply,
  cancelReplyAcceptance,
  createComment,
  deleteComment,
  getComments,
  reportComment,
  updateComment,
  type CommentResponse,
  type RootCommentResponse,
} from '../api/commentApi';
import { ApiRequestError } from '../api/http';
import { useProfanityNotice } from './useProfanityNotice';
import { getMemberProfile, type MemberProfileResponse } from '../api/mypageApi';
import { inviteToParty } from '../api/postApi';
import { COMMENT_PAGE_SIZE, commentText, type CommentChannel, type CommentSort, type PostComment } from '../data/commentData';
import { useModal } from './useModal';
import { usePagination } from './usePagination';
import { useToast } from './useToast';

/** 프로필 팝오버에 보여줄 작성자 정보. 불러오는 중이면 'loading', 실패하면 'error' */
export type CommentAuthorProfile = MemberProfileResponse | 'loading' | 'error';

const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiRequestError ? (err.fields[0]?.message ?? err.message) : fallback);

/** API 댓글 → 화면용 PostComment. seq 는 서버가 정한 순서(목록 안의 위치)입니다. */
function toPostComment(c: CommentResponse, seq: number, now: number): PostComment {
  return {
    id: String(c.id),
    authorId: c.author.id,
    seq,
    parentId: c.parentId === null ? undefined : String(c.parentId),
    author: c.author.nickname,
    initial: Array.from(c.author.nickname)[0] ?? '?',
    avatarUrl: c.author.avatarUrl,
    badge: c.isPostAuthor ? 'author' : c.mine ? 'mine' : undefined,
    mine: c.mine,
    locked: c.text === null,
    hidden: c.hidden,
    ageMin: Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / 60000)),
    text: c.text ?? '',
    secret: c.secret,
    reported: c.reported,
    accepted: c.accepted,
    solved: (c as Partial<RootCommentResponse>).acceptedReplyId != null,
    partyMember: c.partyMember,
  };
}

export interface CommentThreadOptions {
  /** 기본 public. party 는 참가자 전용 댓글 */
  readonly channel?: CommentChannel;
  /** false 면 불러오지 않습니다 (파티원이 아니어서 참가자 전용 댓글을 볼 수 없을 때) */
  readonly enabled?: boolean;
}

/**
 * 댓글 스레드: 서버(GET /api/posts/{postId}/comments)에서 루트 댓글 기준 페이지를 불러오고
 * 작성·답글·수정·삭제·신고를 API 로 처리합니다. 정렬·페이지가 바뀌면 다시 불러옵니다.
 * @param initialTotal 공고 상세의 commentCount (대댓글 포함 전체 댓글 수). 참가자 전용 채널은 공고 수에 들어가지 않으므로 목록 응답의 commentCount 를 씁니다.
 */
export function useComments(postId: string, initialTotal: number, { channel = 'public', enabled = true }: CommentThreadOptions = {}) {
  const [comments, setComments] = useState<readonly PostComment[]>([]);
  const [rootTotal, setRootTotal] = useState(0);
  const [channelCount, setChannelCount] = useState(0);
  const [totalDelta, setTotalDelta] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [jumpTo, setJumpTo] = useState<number | null>(null);
  const [sort, setSort] = useState<CommentSort>('oldest');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Readonly<Record<number, CommentAuthorProfile>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const deleteDialog = useModal(false);
  const reportDialog = useModal(false);
  const toast = useToast();
  const profanity = useProfanityNotice();

  const paging = usePagination(rootTotal, COMMENT_PAGE_SIZE, `${postId}${sort}`);
  const page = paging.page;
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 서버가 내려준 댓글 수가 바뀌면(다시 불러오면) 내가 화면에서 더해 둔 보정값은 이미 반영된 것이므로 비웁니다.
  useEffect(() => setTotalDelta(0), [initialTotal]);

  useEffect(() => {
    if (!enabled) {
      setComments([]);
      setRootTotal(0);
      setChannelCount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getComments(postId, { sort, page, size: COMMENT_PAGE_SIZE, channel })
      .then((result) => {
        if (cancelled) return;
        const now = Date.now();
        const flat = result.items.flatMap((root) => [root, ...root.replies]);
        setComments(flat.map((c, i) => toPostComment(c, i, now)));
        setRootTotal(result.totalCount);
        setChannelCount(result.commentCount);
        // 참가자 전용 수는 방금 받은 commentCount 에 이미 반영돼 있으므로 화면 보정값을 비웁니다.
        if (channel === 'party') setTotalDelta(0);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, commentText.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, sort, page, reloadKey, channel, enabled]);

  // 새 루트 댓글을 단 뒤 그 댓글이 보이는 페이지로 이동합니다 (전체 페이지 수가 늘어난 다음에 이동해야 합니다).
  useEffect(() => {
    if (jumpTo === null || paging.totalPages < jumpTo) return;
    paging.goTo(jumpTo);
    setJumpTo(null);
  }, [jumpTo, paging]);

  // 프로필 팝오버를 열면 작성자 프로필(GET /api/members/{memberId})을 한 번만 불러옵니다.
  const popoverAuthorId = comments.find((c) => c.id === popoverFor)?.authorId ?? null;
  const popoverProfileLoaded = popoverAuthorId !== null && profiles[popoverAuthorId] !== undefined;
  useEffect(() => {
    if (popoverAuthorId === null || popoverProfileLoaded) return;
    setProfiles((prev) => ({ ...prev, [popoverAuthorId]: 'loading' }));
    getMemberProfile(popoverAuthorId)
      .then((profile) => setProfiles((prev) => ({ ...prev, [popoverAuthorId]: profile })))
      .catch(() => setProfiles((prev) => ({ ...prev, [popoverAuthorId]: 'error' })));
  }, [popoverAuthorId, popoverProfileLoaded]);

  const visible = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesOf = useCallback((id: string) => comments.filter((c) => c.parentId === id), [comments]);
  const profileOf = (authorId: number): CommentAuthorProfile => profiles[authorId] ?? 'loading';

  /** 댓글·답글 작성. 성공하면 true (입력창을 비움), 실패하면 토스트를 띄우고 false */
  const add = async (text: string, opts: { parentId?: string; secret?: boolean } = {}) => {
    const body = text.trim();
    if (!body) return false;
    try {
      await createComment(postId, { text: body, secret: opts.secret ?? false, channel, ...(opts.parentId ? { parentId: Number(opts.parentId) } : {}) });
    } catch (err) {
      if (!profanity.catches(err)) toast.show(errorMessage(err, commentText.loadFailed));
      return false;
    }
    setReplyTo(null);
    setTotalDelta((d) => d + 1);
    toast.show(commentText.added);
    if (!opts.parentId) {
      // 새 루트 댓글은 등록순이면 마지막 페이지, 최신순이면 첫 페이지에 보입니다.
      const nextRootTotal = rootTotal + 1;
      setRootTotal(nextRootTotal);
      setJumpTo(sort === 'oldest' ? Math.ceil(nextRootTotal / COMMENT_PAGE_SIZE) : 1);
    }
    reload();
    return true;
  };

  const saveEdit = async (id: string, text: string) => {
    const body = text.trim();
    if (!body) return;
    try {
      const updated = await updateComment(Number(id), body);
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: updated.text ?? body, edited: true } : c)));
      setEditing(null);
      toast.show(commentText.updated);
      reload(); // 채택된 답글을 고치면 채택이 풀리므로 목록을 다시 불러옵니다.
    } catch (err) {
      if (!profanity.catches(err)) toast.show(errorMessage(err, commentText.loadFailed));
    }
  };

  const askDelete = (id: string) => { setDeleteId(id); deleteDialog.open(); };
  const confirmDelete = async () => {
    const id = deleteId;
    deleteDialog.close();
    setDeleteId(null);
    if (!id) return;
    try {
      await deleteComment(Number(id));
      // 루트 댓글이면 화면에 있는 답글도 함께 삭제됩니다.
      setTotalDelta((d) => d - 1 - comments.filter((c) => c.parentId === id).length);
      toast.show(commentText.deleted);
      reload();
    } catch (err) {
      toast.show(errorMessage(err, commentText.loadFailed));
    }
  };

  /** 댓글 작성자: 그 댓글에 달린 답글 채택(이미 채택한 답글이 있으면 교체). 성공하면 다시 불러와 답글 맨 위에 하이라이트합니다. */
  const accept = async (id: string) => {
    try {
      await acceptReply(Number(id));
      toast.show(commentText.acceptedToast);
      reload();
    } catch (err) {
      toast.show(errorMessage(err, commentText.loadFailed));
    }
  };
  const cancelAccept = async (id: string) => {
    try {
      await cancelReplyAcceptance(Number(id));
      toast.show(commentText.cancelAcceptedToast);
      reload();
    } catch (err) {
      toast.show(errorMessage(err, commentText.loadFailed));
    }
  };

  const markReported = (id: string) => setComments((prev) => prev.map((c) => (c.id === id ? { ...c, reported: true } : c)));
  const askReport = (id: string) => { setReportId(id); reportDialog.open(); };
  /** 신고 접수. detail 은 선택 입력(빈 문자열이면 보내지 않음) */
  const confirmReport = async (reason: string, detail = '') => {
    const id = reportId;
    reportDialog.close();
    setReportId(null);
    if (!id) return;
    try {
      await reportComment(Number(id), reason, detail.trim() || undefined);
      markReported(id);
      toast.show(commentText.reportedToast);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ALREADY_REPORTED') markReported(id);
      toast.show(errorMessage(err, commentText.loadFailed));
    }
  };

  /** 공대장: 댓글 작성자를 이 공고 파티에 초대합니다. 결과는 토스트로 알립니다. */
  const invite = async (memberId: number) => {
    try {
      await inviteToParty(postId, memberId);
      toast.show(commentText.popover.invited);
      return true;
    } catch (err) {
      toast.show(errorMessage(err, commentText.popover.inviteFailed));
      return false;
    }
  };

  return {
    channel, invite,
    comments, accept, cancelAccept, refresh: reload, total: channel === 'party' ? channelCount + totalDelta : Math.max(0, initialTotal + totalDelta), visible, repliesOf, sort, setSort, paging, loading, error,
    replyTo, setReplyTo, editing, setEditing, popoverFor, setPopoverFor, profileOf,
    add, saveEdit, askDelete, confirmDelete, askReport, confirmReport, deleteDialog, reportDialog, toast, profanity,
  };
}
