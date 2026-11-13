'use strict';

const { ApiError } = require('../common/ApiError');
const { boardMessages } = require('./boardConstants');
const { COMMENT_STATUS, MEMBER_STATUS, commentMessages } = require('./commentConstants');
const { parseCommentListQuery, validateCreateComment } = require('./commentValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);

/**
 * 비밀 댓글 본문을 볼 수 있는지: 댓글 작성자, 공고 작성자, (대댓글이면) 부모 댓글 작성자.
 * @param {number | null} viewerId 비로그인이면 null
 */
function canReadSecret(row, { viewerId, postAuthorId, parentAuthorId }) {
  if (viewerId === null) return false;
  return viewerId === row.authorId || viewerId === postAuthorId || viewerId === parentAuthorId;
}

/** DB 행 → 댓글 응답 (docs/API_SPEC.md 5절 「댓글 아이템」) */
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
    createdAt: toIso(row.createdAt),
  };
}

/** 정지·영구 정지·탈퇴 회원이면 403 (정지 기간이 지난 SUSPENDED 는 허용) */
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
 * 댓글 조회·작성 비즈니스 로직.
 * @param {{ commentRepository: ReturnType<typeof import('./commentRepository').createCommentRepository>, now?: () => Date }} deps
 */
function createCommentService({ commentRepository, now = () => new Date() }) {
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

    const base = { viewerId, postAuthorId: post.authorId, parentAuthorId: null };
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

  return { listComments, createComment };
}

module.exports = { createCommentService };
