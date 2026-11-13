import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createComment,
  deleteComment,
  getComments,
  reportComment,
  updateComment,
  type CommentResponse,
} from '../api/commentApi';
import { ApiRequestError } from '../api/http';
import { getMemberProfile, type MemberProfileResponse } from '../api/memberApi';
import { COMMENT_PAGE_SIZE, commentText, type CommentSort, type PostComment } from '../data/commentData';
import { useModal } from './useModal';
import { usePagination } from './usePagination';
import { useToast } from './useToast';

/** 프로필 팝오버에 보여줄 작성자 정보. 불러오는 중이면 'loading', 실패하면 'error' */
export type CommentAuthorProfile = MemberProfileResponse | 'loading' | 'error';

const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiRequestError ? err.message : fallback);

/** API 댓글 → 화면용 PostComment. seq 는 서버가 정한 순서(목록 안의 위치)입니다. */
function toPostComment(c: CommentResponse, seq: number, now: number): PostComment {
  return {
    id: String(c.id),
    authorId: c.author.id,
    seq,
    parentId: c.parentId === null ? undefined : String(c.parentId),
    author: c.author.nickname,
    initial: Array.from(c.author.nickname)[0] ?? '?',
    badge: c.isPostAuthor ? 'author' : c.mine ? 'mine' : undefined,
    mine: c.mine,
    locked: c.text === null,
    hidden: c.hidden,
    ageMin: Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / 60000)),
    text: c.text ?? '',
    secret: c.secret,
    reported: c.reported,
  };
}

/**
 * 댓글 스레드: 서버(GET /api/posts/{postId}/comments)에서 루트 댓글 기준 페이지를 불러오고
 * 작성·답글·수정·삭제·신고를 API 로 처리합니다. 정렬·페이지가 바뀌면 다시 불러옵니다.
 * @param initialTotal 공고 상세의 commentCount (대댓글 포함 전체 댓글 수)
 */
export function useComments(postId: string, initialTotal: number) {
  const [comments, setComments] = useState<readonly PostComment[]>([]);
  const [rootTotal, setRootTotal] = useState(0);
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

  const paging = usePagination(rootTotal, COMMENT_PAGE_SIZE, `${postId}${sort}`);
  const page = paging.page;
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getComments(postId, { sort, page, size: COMMENT_PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        const now = Date.now();
        const flat = result.items.flatMap((root) => [root, ...root.replies]);
        setComments(flat.map((c, i) => toPostComment(c, i, now)));
        setRootTotal(result.totalCount);
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
  }, [postId, sort, page, reloadKey]);

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
      await createComment(postId, { text: body, secret: opts.secret ?? false, ...(opts.parentId ? { parentId: Number(opts.parentId) } : {}) });
    } catch (err) {
      toast.show(errorMessage(err, commentText.loadFailed));
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
    } catch (err) {
      toast.show(errorMessage(err, commentText.loadFailed));
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

  const markReported = (id: string) => setComments((prev) => prev.map((c) => (c.id === id ? { ...c, reported: true } : c)));
  const askReport = (id: string) => { setReportId(id); reportDialog.open(); };
  const confirmReport = async (reason: string) => {
    const id = reportId;
    reportDialog.close();
    setReportId(null);
    if (!id) return;
    try {
      await reportComment(Number(id), reason);
      markReported(id);
      toast.show(commentText.reportedToast);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ALREADY_REPORTED') markReported(id);
      toast.show(errorMessage(err, commentText.loadFailed));
    }
  };

  return {
    comments, total: Math.max(0, initialTotal + totalDelta), visible, repliesOf, sort, setSort, paging, loading, error,
    replyTo, setReplyTo, editing, setEditing, popoverFor, setPopoverFor, profileOf,
    add, saveEdit, askDelete, confirmDelete, askReport, confirmReport, deleteDialog, reportDialog, toast,
  };
}
