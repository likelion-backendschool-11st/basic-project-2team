import { useCallback, useMemo, useState } from 'react';
import { COMMENT_PAGE_SIZE, ME, commentText, initialComments, type CommentSort, type PostComment } from '../data/commentData';
import { useModal } from './useModal';
import { usePagination } from './usePagination';
import { useToast } from './useToast';

/** Comment thread state: add / reply / edit / delete / report, sort and paging. */
export function useComments(ownerName: string, resetKey: string) {
  const [comments, setComments] = useState<readonly PostComment[]>(initialComments);
  const [sort, setSort] = useState<CommentSort>('oldest');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [popoverFor, setPopoverFor] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const deleteDialog = useModal(false);
  const reportDialog = useModal(false);
  const toast = useToast();

  const roots = useMemo(() => {
    const list = comments.filter((c) => !c.parentId);
    const dir = sort === 'oldest' ? 1 : -1;
    return [...list].sort((a, b) => dir * (a.seq - b.seq));
  }, [comments, sort]);
  const repliesOf = useCallback((id: string) => comments.filter((c) => c.parentId === id).sort((a, b) => a.seq - b.seq), [comments]);

  const paging = usePagination(roots.length, COMMENT_PAGE_SIZE, `${resetKey}${sort}`);
  const visible = roots.slice(paging.startIndex, paging.endIndex);

  const add = (text: string, opts: { parentId?: string; secret?: boolean } = {}) => {
    const body = text.trim();
    if (!body) return false;
    const seq = Math.max(0, ...comments.map((c) => c.seq)) + 1;
    const mine = ownerName === ME;
    setComments((prev) => [...prev, { id: `c${seq}`, seq, parentId: opts.parentId, author: ME, initial: ME[0], badge: mine ? 'author' : 'mine', ageMin: 0, text: body, secret: opts.secret }]);
    setReplyTo(null);
    toast.show(commentText.added);
    // A new top-level comment shows up at the end (oldest first) or at the top (newest first).
    if (!opts.parentId) paging.goTo(sort === 'oldest' ? Math.ceil((roots.length + 1) / COMMENT_PAGE_SIZE) : 1);
    return true;
  };

  const saveEdit = (id: string, text: string) => {
    const body = text.trim();
    if (!body) return;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: body, edited: true } : c)));
    setEditing(null);
    toast.show(commentText.updated);
  };

  const askDelete = (id: string) => { setDeleteId(id); deleteDialog.open(); };
  const confirmDelete = () => {
    if (deleteId) setComments((prev) => prev.filter((c) => c.id !== deleteId && c.parentId !== deleteId));
    deleteDialog.close();
    setDeleteId(null);
    toast.show(commentText.deleted);
  };

  const askReport = (id: string) => { setReportId(id); reportDialog.open(); };
  const confirmReport = () => {
    if (reportId) setComments((prev) => prev.map((c) => (c.id === reportId ? { ...c, reported: true } : c)));
    reportDialog.close();
    setReportId(null);
    toast.show(commentText.reportedToast);
  };

  return {
    comments, total: comments.length, visible, repliesOf, sort, setSort, paging,
    replyTo, setReplyTo, editing, setEditing, popoverFor, setPopoverFor,
    add, saveEdit, askDelete, confirmDelete, askReport, confirmReport, deleteDialog, reportDialog, toast,
  };
}
