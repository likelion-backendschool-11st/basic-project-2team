'use strict';

const { ApiError } = require('../common/ApiError');
const { boardMessages } = require('./boardConstants');
const { COMMENT_STATUS, MEMBER_STATUS, commentMessages } = require('./commentConstants');
const {
  parseCommentListQuery,
  validateCreateComment,
  validateUpdateComment,
  validateCreateReport,
} = require('./commentValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
const commentNotFound = () => new ApiError(404, 'COMMENT_NOT_FOUND', commentMessages.commentNotFound);
const EMPTY_SET = new Set();

/**
 * 비밀 댓글 본문을 볼 수 있는지: 댓글 작성자, 공고 작성자, (대댓글이면) 부모 댓글 작성자.
 * @param {number | null} viewerId 비로그인이면 null
 */
function canReadSecret(row, { viewerId, postAuthorId, parentAuthorId }) {
  if (viewerId === null) return false;
  return viewerId === row.authorId || viewerId === postAuthorId || viewerId === parentAuthorId;
}

/**
 * DB 행 → 댓글 응답 (docs/API_SPEC.md 5절 「댓글 아이템」)
 * @param {{ viewerId: number | null, postAuthorId: number, parentAuthorId: number | null, reportedIds?: Set<number> }} context
 */
function toComment(row, context) {
  const secret = Boolean(row.isSecret);
  const withdrawn = row.authorStatus === MEMBER_STATUS.withdrawn;
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    author: {
      id: row.authorId,
      nickname: withdrawn ? commentMessages.withdrawnAuthor : row.authorNickname,
      avatarUrl: withdrawn ? null : (row.authorAvatarUrl ?? null),
    },
    isPostAuthor: row.authorId === context.postAuthorId,
    mine: context.viewerId !== null && row.authorId === context.viewerId,
    text: !secret || canReadSecret(row, context) ? row.content : null,
    secret,
    hidden: row.status === COMMENT_STATUS.hidden,
    reported: (context.reportedIds ?? EMPTY_SET).has(row.id),
    createdAt: toIso(row.createdAt),
  };
}

/** 정지·영구 정지·탈퇴 회원이면 401/403 (정지 기간이 지난 SUSPENDED 는 허용) */
function assertCanWrite(member, current) {
  if (!member || member.status === MEMBER_STATUS.withdrawn) {
    throw new ApiError(401, 'UNAUTHORIZED', commentMessages.unauthorized);
  }
  if (member.status === MEMBER_STATUS.banned) {
    throw new ApiError(403, 'ACCOUNT_BANNED', commentMessages.accountBanned);
  }
  if (member.status === MEMBER_STATUS.suspended && (!member.suspendedUntil || new Date(member.suspendedUntil) > current)) {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', commentMessages.accountSuspended);
  }
}

/**
 * 댓글 조회·작성·수정·삭제·신고 비즈니스 로직.
 * @param {{ commentRepository: ReturnType<typeof import('./commentRepository').createCommentRepository>, now?: () => Date }} deps
 */
function createCommentService({ commentRepository, now = () => new Date() }) {
  /** 수정·삭제·신고 대상 댓글. 없거나 삭제됐으면 404 */
  async function loadComment(commentId) {
    const comment = await commentRepository.findCommentContext(commentId);
    if (!comment) throw commentNotFound();
    return comment;
  }

  /** 본인 댓글이 아니면 403 */
  function assertAuthor(comment, memberId) {
    if (comment.authorId !== memberId) throw new ApiError(403, 'NOT_COMMENT_AUTHOR', commentMessages.notCommentAuthor);
  }

  /**
   * GET /api/posts/{postId}/comments — 루트 댓글 기준 페이지 + 각 루트의 대댓글.
   * @param {number} postId
   * @param {object} query
   * @param {number | null} viewerId 비로그인이면 null
   */
  async function listComments(postId, query, viewerId) {
    const { sort, page, size } = parseCommentListQuery(query);
    const post = await commentRepository.findPost(postId);
    if (!post) throw postNotFound();

    const { rows, totalCount } = await commentRepository.findRootCommentPage({
      postId,
      sort,
      limit: size,
      offset: (page - 1) * size,
    });
    const replies = await commentRepository.findReplies(rows.map((row) => row.id));
    const reportedIds =
      viewerId === null
        ? EMPTY_SET
        : await commentRepository.findReportedCommentIds(viewerId, [...rows, ...replies].map((row) => row.id));

    const base = { viewerId, postAuthorId: post.authorId, parentAuthorId: null, reportedIds };
    const items = rows.map((root) => ({
      ...toComment(root, base),
      replies: replies
        .filter((reply) => reply.parentId === root.id)
        .map((reply) => toComment(reply, { ...base, parentAuthorId: root.authorId })),
    }));

    return { items, page, size, totalCount, totalPages: Math.ceil(totalCount / size) };
  }

  /**
   * POST /api/posts/{postId}/comments — 댓글(parentId 없음) 또는 대댓글(parentId = 루트 댓글 id) 작성.
   * @param {number} postId
   * @param {number} memberId
   * @param {object} body
   */
  async function createComment(postId, memberId, body) {
    const input = validateCreateComment(body);

    const post = await commentRepository.findPost(postId);
    if (!post) throw postNotFound();

    assertCanWrite(await commentRepository.findMemberStatus(memberId), now());

    let parent = null;
    if (input.parentId !== null) {
      parent = await commentRepository.findParentComment(postId, input.parentId);
      if (!parent) throw new ApiError(404, 'COMMENT_NOT_FOUND', commentMessages.parentNotFound);
      if (parent.parentId !== null) {
        throw new ApiError(400, 'REPLY_DEPTH_EXCEEDED', commentMessages.replyDepthExceeded);
      }
    }

    const id = await commentRepository.createComment({
      postId,
      authorId: memberId,
      parentId: input.parentId,
      content: input.text,
      isSecret: input.secret,
    });

    const row = await commentRepository.findCommentById(id);
    return toComment(row, { viewerId: memberId, postAuthorId: post.authorId, parentAuthorId: parent?.authorId ?? null });
  }

  /**
   * PATCH /api/comments/{commentId} — 본인 댓글의 본문을 고칩니다. 관리자가 가린 댓글은 고칠 수 없습니다.
   * @param {number} commentId
   * @param {number} memberId
   * @param {object} body
   */
  async function updateComment(commentId, memberId, body) {
    const { text } = validateUpdateComment(body);
    const comment = await loadComment(commentId);
    assertAuthor(comment, memberId);
    if (comment.status === COMMENT_STATUS.hidden) {
      throw new ApiError(403, 'COMMENT_HIDDEN', commentMessages.commentHidden);
    }
    assertCanWrite(await commentRepository.findMemberStatus(memberId), now());

    await commentRepository.updateCommentContent(commentId, text);
    return toComment(
      { ...comment, content: text },
      { viewerId: memberId, postAuthorId: comment.postAuthorId, parentAuthorId: comment.parentAuthorId ?? null },
    );
  }

  /**
   * DELETE /api/comments/{commentId} — 본인 댓글을 대댓글과 함께 소프트 삭제합니다.
   * @param {number} commentId
   * @param {number} memberId
   */
  async function deleteComment(commentId, memberId) {
    const comment = await loadComment(commentId);
    assertAuthor(comment, memberId);
    await commentRepository.deleteCommentWithReplies({ commentId, postId: comment.postId, deletedAt: now() });
  }

  /**
   * POST /api/reports — 댓글 신고. 같은 댓글은 한 번만, 본인 댓글은 신고할 수 없습니다.
   * @param {number} memberId
   * @param {object} body
   */
  async function reportComment(memberId, body) {
    const input = validateCreateReport(body);
    const comment = await loadComment(input.targetId);
    if (comment.authorId === memberId) {
      throw new ApiError(400, 'CANNOT_REPORT_SELF', commentMessages.cannotReportSelf);
    }

    const id = await commentRepository.createCommentReport({
      reporterId: memberId,
      commentId: comment.id,
      targetMemberId: comment.authorId,
      postId: comment.postId,
      reasonCode: input.reason,
      detail: input.detail,
    });
    if (id === null) throw new ApiError(409, 'ALREADY_REPORTED', commentMessages.alreadyReported);
    return { id };
  }

  return { listComments, createComment, updateComment, deleteComment, reportComment };
}

module.exports = { createCommentService };
