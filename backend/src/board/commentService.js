'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_EVENT, NO_EVENTS } = require('../common/postEvents');
const { boardMessages } = require('./boardConstants');
const { COMMENT_CHANNELS, COMMENT_STATUS, MEMBER_STATUS, REPORT_TARGET_TYPES, commentMessages } = require('./commentConstants');
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
 * party 는 참가자 전용 채널에서만 넘기는 파티 확정 인원(memberId → 정보)이며, 작성자가 지금 파티원이면 partyMember 로 내려갑니다.
 * @param {{ viewerId: number | null, postAuthorId: number, parentAuthorId: number | null, reportedIds?: Set<number>, accepted?: boolean, party?: Map<number, { isHost: boolean, role: string | null, mannerTemp: number }> }} context
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
    accepted: context.accepted === true,
    partyOnly: Boolean(row.isPartyOnly),
    partyMember: toPartyMember(context.party?.get(row.authorId)),
    createdAt: toIso(row.createdAt),
  };
}

/** 참가자 전용 댓글 작성자의 파티 정보 (공대장 여부 · 신청 포지션 · 매너 온도). 파티를 떠났으면 null */
function toPartyMember(member) {
  return member ? { isHost: member.isHost, role: member.role ?? null, mannerTemp: member.mannerTemp } : null;
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
function createCommentService({ commentRepository, postEvents = NO_EVENTS, now = () => new Date() }) {
  const commentsChanged = (postId) => postEvents.publish(postId, POST_EVENT.comments);

  /** 수정·삭제·신고 대상 댓글. 없거나 삭제됐으면 404 */
  async function loadComment(commentId) {
    const comment = await commentRepository.findCommentContext(commentId);
    if (!comment) throw commentNotFound();
    return comment;
  }

  /** 공고의 파티 확정 인원(공대장 + 승인된 파티원)을 memberId → 정보 Map 으로 */
  async function loadParty(postId) {
    const rows = await commentRepository.findPartyMembers(postId);
    return new Map(rows.map((row) => [row.memberId, row]));
  }

  /** 참가자 전용 댓글은 파티 확정 인원만: 비로그인 401, 파티원이 아니면 403 PARTY_ONLY */
  function assertPartyMember(party, memberId) {
    if (memberId === null) throw new ApiError(401, 'UNAUTHORIZED', commentMessages.unauthorized);
    if (!party.has(memberId)) throw new ApiError(403, 'PARTY_ONLY', commentMessages.partyOnly);
  }

  /** 참가자 전용 댓글이면 파티원인지 확인하고 파티 정보를, 일반 댓글이면 undefined 를 돌려줍니다. */
  async function partyFor(comment, memberId) {
    if (!comment.isPartyOnly) return undefined;
    const party = await loadParty(comment.postId);
    assertPartyMember(party, memberId);
    return party;
  }

  /** 본인 댓글이 아니면 403 */
  function assertAuthor(comment, memberId) {
    if (comment.authorId !== memberId) throw new ApiError(403, 'NOT_COMMENT_AUTHOR', commentMessages.notCommentAuthor);
  }

  /**
   * GET /api/posts/{postId}/comments — 루트 댓글 기준 페이지 + 각 루트의 대댓글.
   * channel=party 면 참가자 전용 댓글을 파티 확정 인원에게만 돌려줍니다.
   * @param {number} postId
   * @param {object} query
   * @param {number | null} viewerId 비로그인이면 null
   */
  async function listComments(postId, query, viewerId) {
    const { sort, page, size, channel } = parseCommentListQuery(query);
    const post = await commentRepository.findPost(postId);
    if (!post) throw postNotFound();

    const partyOnly = channel === COMMENT_CHANNELS.party;
    let party;
    if (partyOnly) {
      party = await loadParty(postId);
      assertPartyMember(party, viewerId);
    }

    const { rows, totalCount, commentCount } = await commentRepository.findRootCommentPage({
      postId,
      sort,
      limit: size,
      offset: (page - 1) * size,
      partyOnly,
    });
    const replies = await commentRepository.findReplies(rows.map((row) => row.id));
    const reportedIds =
      viewerId === null
        ? EMPTY_SET
        : await commentRepository.findReportedCommentIds(viewerId, [...rows, ...replies].map((row) => row.id));

    const base = { viewerId, postAuthorId: post.authorId, parentAuthorId: null, reportedIds, party };
    const items = rows.map((root) => {
      // 채택된 답글(보이는 상태일 때만)도 등록순 위치 그대로 두고 accepted 로 표시합니다. 맨 위 복사본은 화면이 acceptedReplyId 로 만듭니다.
      const mine = replies.filter((reply) => reply.parentId === root.id);
      const acceptedId = mine.find((reply) => reply.id === root.acceptedReplyId && reply.status === COMMENT_STATUS.visible)?.id ?? null;
      return {
        ...toComment(root, base),
        acceptedReplyId: acceptedId,
        replies: mine.map((reply) => toComment(reply, { ...base, parentAuthorId: root.authorId, accepted: reply.id === acceptedId })),
      };
    });

    return { items, page, size, totalCount, totalPages: Math.ceil(totalCount / size), channel, commentCount };
  }

  /**
   * POST /api/posts/{postId}/comments — 댓글(parentId 없음) 또는 대댓글(parentId = 루트 댓글 id) 작성.
   * channel=party 면 참가자 전용 댓글이고(파티원만, 비밀 댓글 없음), 답글은 부모 댓글의 채널을 따릅니다.
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

    const isPartyOnly = parent ? Boolean(parent.isPartyOnly) : input.channel === COMMENT_CHANNELS.party;
    const party = await partyFor({ postId, isPartyOnly }, memberId);

    const id = await commentRepository.createComment({
      postId,
      authorId: memberId,
      parentId: input.parentId,
      content: input.text,
      // 참가자 전용 채널은 이미 파티원끼리만 보므로 비밀 댓글을 두지 않습니다.
      isSecret: isPartyOnly ? false : input.secret,
      isPartyOnly,
    });

    const row = await commentRepository.findCommentById(id);
    commentsChanged(postId);
    return toComment(row, { viewerId: memberId, postAuthorId: post.authorId, parentAuthorId: parent?.authorId ?? null, party });
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
    const party = await partyFor(comment, memberId); // 파티를 떠났으면 참가자 전용 댓글은 고칠 수 없음 (삭제는 가능)

    await commentRepository.updateCommentContent(commentId, text); // 채택된 답글이면 채택도 함께 풀림
    commentsChanged(comment.postId);
    return toComment(
      { ...comment, content: text },
      {
        viewerId: memberId,
        postAuthorId: comment.postAuthorId,
        parentAuthorId: comment.parentAuthorId ?? null,
        party,
      },
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
    await commentRepository.deleteCommentWithReplies({
      commentId,
      postId: comment.postId,
      deletedAt: now(),
      isPartyOnly: Boolean(comment.isPartyOnly),
    });
    commentsChanged(comment.postId);
  }

  /**
   * PUT /api/comments/{commentId}/accept — 답글이 달린 댓글의 작성자가 그 답글을 채택합니다(이미 채택한 답글이 있으면 이 답글로 바뀜).
   * 대상은 답글(대댓글)만 가능하고, 본인이 쓴 답글·비밀 답글·관리자가 가린 답글은 채택할 수 없습니다.
   * @param {number} commentId 채택할 답글의 id
   * @param {number} memberId
   */
  async function acceptComment(commentId, memberId) {
    const reply = await loadComment(commentId);
    if (reply.parentId === null) throw new ApiError(400, 'NOT_A_REPLY', commentMessages.notAReply);
    if (reply.parentAuthorId !== memberId) throw new ApiError(403, 'NOT_PARENT_AUTHOR', commentMessages.notParentAuthor);
    if (reply.authorId === memberId) throw new ApiError(400, 'CANNOT_ACCEPT_OWN', commentMessages.cannotAcceptOwn);
    if (reply.isSecret) throw new ApiError(400, 'CANNOT_ACCEPT_SECRET', commentMessages.cannotAcceptSecret);
    if (reply.status !== COMMENT_STATUS.visible) throw new ApiError(400, 'COMMENT_HIDDEN', commentMessages.cannotAcceptHidden);
    await partyFor(reply, memberId);

    await commentRepository.setAcceptedReply(reply.parentId, reply.id);
    commentsChanged(reply.postId);
    return { commentId: reply.parentId, acceptedReplyId: reply.id };
  }

  /**
   * DELETE /api/comments/{commentId}/accept — 댓글 작성자가 이 답글의 채택을 취소합니다. 채택된 답글이 아니면 아무 일도 없습니다.
   * @param {number} commentId 답글의 id
   * @param {number} memberId
   */
  async function cancelAcceptance(commentId, memberId) {
    const reply = await loadComment(commentId);
    if (reply.parentId === null) throw new ApiError(400, 'NOT_A_REPLY', commentMessages.notAReply);
    if (reply.parentAuthorId !== memberId) throw new ApiError(403, 'NOT_PARENT_AUTHOR', commentMessages.notParentAuthor);
    if (reply.parentAcceptedReplyId !== reply.id) return;
    await partyFor(reply, memberId);
    await commentRepository.setAcceptedReply(reply.parentId, null);
    commentsChanged(reply.postId);
  }

  /**
   * POST /api/reports — targetType 에 따라 댓글 또는 공고를 신고합니다.
   * @param {number} memberId
   * @param {object} body
   */
  async function createReport(memberId, body) {
    const input = validateCreateReport(body);
    return input.targetType === REPORT_TARGET_TYPES.post ? reportPost(memberId, input) : reportComment(memberId, input);
  }

  /** 공고 신고 (REQ-REPORT-003). 같은 공고는 한 번만, 본인 공고는 신고할 수 없습니다. */
  async function reportPost(memberId, input) {
    const post = await commentRepository.findPost(input.targetId);
    if (!post) throw postNotFound();
    if (post.authorId === memberId) throw new ApiError(400, 'CANNOT_REPORT_SELF', commentMessages.cannotReportOwnPost);

    const id = await commentRepository.createPostReport({
      reporterId: memberId,
      postId: post.id,
      targetMemberId: post.authorId,
      reasonCode: input.reason,
      detail: input.detail,
    });
    if (id === null) throw new ApiError(409, 'ALREADY_REPORTED', commentMessages.alreadyReportedPost);
    return { id };
  }

  /** 댓글 신고. 같은 댓글은 한 번만, 본인 댓글은 신고할 수 없습니다. */
  async function reportComment(memberId, input) {
    const comment = await loadComment(input.targetId);
    if (comment.authorId === memberId) {
      throw new ApiError(400, 'CANNOT_REPORT_SELF', commentMessages.cannotReportSelf);
    }
    await partyFor(comment, memberId); // 볼 수 없는 참가자 전용 댓글은 신고할 수도 없음

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

  return { listComments, createComment, updateComment, deleteComment, acceptComment, cancelAcceptance, createReport };
}

module.exports = { createCommentService };
