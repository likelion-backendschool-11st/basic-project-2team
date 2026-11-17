'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_EVENT, NO_EVENTS } = require('../common/postEvents');
const {
  APPLICATION_STATUS: S,
  INVITATION_STATUS: I,
  POST_STATUS,
  MEMBER_STATUS,
  LATE_CANCEL_HOURS,
  APPLICANT_TOP_TAG_LIMIT,
  NOTIFICATION_TYPE,
  NOTIFICATION_TITLE_MAX,
  partyMessages: m,
} = require('./partyConstants');
const { parseId, validateApply, validateDecision, validatePostStatus, parseListStatus, validateInvite, validateInvitationResponse } = require('./partyValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', m.postNotFound);
const applicationNotFound = () => new ApiError(404, 'APPLICATION_NOT_FOUND', m.applicationNotFound);

/** 정지·영구 정지·탈퇴 회원이면 401/403 (정지 기간이 지난 SUSPENDED 는 허용) */
function assertCanApply(member, current) {
  if (!member || member.status === MEMBER_STATUS.withdrawn) throw new ApiError(401, 'UNAUTHORIZED', m.unauthorized);
  if (member.status === MEMBER_STATUS.banned) throw new ApiError(403, 'ACCOUNT_BANNED', m.accountBanned);
  if (member.status === MEMBER_STATUS.suspended && (!member.suspendedUntil || new Date(member.suspendedUntil) > current)) {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', m.accountSuspended);
  }
}

/** 알림 문구에 넣는 공고 제목 (길면 줄임표로 자름) */
const clipTitle = (title) => (Array.from(title).length > NOTIFICATION_TITLE_MAX ? `${Array.from(title).slice(0, NOTIFICATION_TITLE_MAX).join('')}…` : title);

/** 신청자·파티원 행 → API 의 회원 요약. 탈퇴한 회원은 닉네임·아바타를 가립니다. */
function toMember(row) {
  const withdrawn = row.memberStatus === MEMBER_STATUS.withdrawn;
  return {
    id: row.memberId,
    nickname: withdrawn ? m.withdrawnMember : row.nickname,
    avatarUrl: withdrawn ? null : (row.avatarUrl ?? null),
    level: row.level,
    mannerTemp: Number(row.mannerTemp),
    reviewCount: row.reviewCount,
  };
}

/**
 * 참가 신청 · 취소 · 신청자 목록 · 승인/거절 · 파티원 조회 비즈니스 로직 (docs/API_SPEC.md 4절).
 * @param {{ partyRepository: ReturnType<typeof import('./partyRepository').createPartyRepository>, now?: () => Date }} deps
 */
function createPartyService({ partyRepository, postEvents = NO_EVENTS, now = () => new Date() }) {
  const changed = (postId) => postEvents.publish(postId, POST_EVENT.post);

  async function loadPost(rawPostId) {
    const postId = parseId(rawPostId);
    const post = postId === null ? null : await partyRepository.findPost(postId);
    if (!post) throw postNotFound();
    return post;
  }

  async function loadOwnedPost(rawPostId, memberId) {
    const post = await loadPost(rawPostId);
    if (post.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', m.notPostAuthor);
    return post;
  }

  /** POST /api/posts/:postId/applications — 마감·가득 찬 공고, 본인 공고, 중복 신청은 거절. 취소했던 신청은 같은 행을 되살립니다. */
  async function apply(rawPostId, memberId, body) {
    const input = validateApply(body);
    const applicant = await partyRepository.findMemberStatus(memberId);
    assertCanApply(applicant, now());
    const post = await loadPost(rawPostId);

    if (post.authorId === memberId) throw new ApiError(403, 'CANNOT_APPLY_OWN_POST', m.cannotApplyOwnPost);
    if (post.currentCount >= post.headcount) throw new ApiError(409, 'PARTY_FULL', m.partyFull);
    if (post.status === POST_STATUS.paused) throw new ApiError(409, 'POST_PAUSED', m.postPaused);
    if (post.status !== POST_STATUS.open) throw new ApiError(409, 'POST_CLOSED', m.postClosed);

    const notice = {
      memberId: post.authorId,
      type: NOTIFICATION_TYPE.applicationReceived,
      message: m.notice.applicationReceived(applicant.nickname, clipTitle(post.title)),
    };
    const existing = await partyRepository.findMyApplication(post.id, memberId);
    const alreadyApplied = () => new ApiError(409, 'ALREADY_APPLIED', m.alreadyApplied);
    if (existing) {
      if ([S.pending, S.accepted].includes(existing.status)) throw alreadyApplied();
      if (existing.status !== S.canceled) throw new ApiError(403, 'REAPPLY_NOT_ALLOWED', m.reapplyNotAllowed);
      if (!(await partyRepository.reapply({ id: existing.id, postId: post.id, notice, ...input }))) throw alreadyApplied();
      changed(post.id);
      return { id: existing.id, status: S.pending };
    }

    const id = await partyRepository.createApplication({ postId: post.id, applicantId: memberId, notice, ...input });
    if (id === null) throw alreadyApplied();
    changed(post.id);
    return { id, status: S.pending };
  }

  /** DELETE /api/posts/:postId/applications/me */
  async function cancelMine(rawPostId, memberId) {
    const post = await loadPost(rawPostId);
    if (post.status === POST_STATUS.completed) throw new ApiError(409, 'POST_COMPLETED', m.cancelNotAllowed);

    const current = now();
    const lateCancel = post.scheduleAt ? new Date(post.scheduleAt).getTime() - current.getTime() <= LATE_CANCEL_HOURS * 3_600_000 : false;
    const applicant = await partyRepository.findMemberStatus(memberId);
    const notice = {
      memberId: post.authorId,
      type: NOTIFICATION_TYPE.applicationCanceled,
      message: m.notice.applicationCanceled(applicant?.nickname ?? m.withdrawnMember, clipTitle(post.title)),
    };
    const canceled = await partyRepository.cancelApplication({ postId: post.id, applicantId: memberId, canceledAt: current, lateCancel, notice });
    if (!canceled) throw applicationNotFound();
    changed(post.id);
  }

  /** GET /api/posts/:postId/applications?status= — 작성자만 */
  async function listApplications(rawPostId, memberId, query) {
    const status = parseListStatus(query);
    const post = await loadOwnedPost(rawPostId, memberId);
    const rows = await partyRepository.findApplications(post.id, status);
    // 탈퇴한 신청자는 닉네임처럼 받은 태그도 보여 주지 않습니다.
    const visibleIds = [...new Set(rows.filter((row) => row.memberStatus !== MEMBER_STATUS.withdrawn).map((row) => row.memberId))];
    const topTags = await partyRepository.findTopTagsByMembers(visibleIds, APPLICANT_TOP_TAG_LIMIT);
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      role: row.role,
      message: row.message,
      appliedAt: toIso(row.appliedAt),
      applicant: { ...toMember(row), topTags: topTags.get(row.memberId) ?? [] },
    }));
  }

  /** PATCH /api/posts/:postId/applications/:applicationId — 작성자만. PENDING 만 처리하고 승인하면 확정 인원이 늘어납니다. */
  async function decide(rawPostId, rawApplicationId, memberId, body) {
    const { status } = validateDecision(body);
    const post = await loadOwnedPost(rawPostId, memberId);
    const applicationId = parseId(rawApplicationId);
    if (applicationId === null) throw applicationNotFound();

    const outcome = await partyRepository.decideApplication({
      postId: post.id,
      applicationId,
      status,
      decidedAt: now(),
      notices: {
        accepted: m.notice.accepted(clipTitle(post.title)),
        rejected: m.notice.rejected(clipTitle(post.title)),
        closed: m.notice.closed(clipTitle(post.title)),
      },
    });
    switch (outcome.result) {
      case 'OK':
        changed(post.id);
        return { id: applicationId, status, current: outcome.current, max: outcome.max, postStatus: outcome.postStatus };
      case 'ALREADY_DECIDED':
        throw new ApiError(409, 'ALREADY_DECIDED', m.alreadyDecided);
      case 'POST_CLOSED':
        throw new ApiError(409, 'POST_CLOSED', m.postClosed);
      case 'FULL':
        throw new ApiError(409, 'PARTY_FULL', m.partyFull);
      default:
        throw applicationNotFound();
    }
  }

  /** PATCH /api/posts/:postId/status — 작성자만. 모집 중 ↔ 마감 · 일시 중단, 완료 처리 */
  async function changeStatus(rawPostId, memberId, body) {
    const { status } = validatePostStatus(body);
    const post = await loadOwnedPost(rawPostId, memberId);
    const title = clipTitle(post.title);
    const notice = { [POST_STATUS.closed]: m.notice.closed(title), [POST_STATUS.completed]: m.notice.completed(title) }[status] ?? null;
    const outcome = await partyRepository.changePostStatus({ postId: post.id, status, now: now(), notice });
    switch (outcome.result) {
      case 'OK':
        changed(post.id);
        return { id: post.id, status: outcome.status, current: outcome.current, max: outcome.max };
      case 'COMPLETED':
        throw new ApiError(409, 'POST_COMPLETED', m.postCompleted);
      case 'FULL':
        throw new ApiError(409, 'PARTY_FULL', m.partyFull);
      case 'NOT_PAUSABLE':
        throw new ApiError(409, 'POST_NOT_PAUSABLE', m.pauseNotAllowed);
      case 'NO_MEMBERS':
        throw new ApiError(409, 'COMPLETE_NOT_ALLOWED', m.completeNoMembers);
      default:
        throw postNotFound();
    }
  }

  /** GET /api/posts/:postId/participants — 파티장 + 수락된 파티원 */
  async function listParticipants(rawPostId) {
    const post = await loadPost(rawPostId);
    const rows = await partyRepository.findParticipants(post.id);
    return rows.map((row) => ({ ...toMember(row), role: row.role, isHost: Boolean(row.isHost) }));
  }

  /**
   * POST /api/posts/:postId/invitations — 작성자가 모집 중인 공고에 회원을 초대합니다.
   * 초대받은 회원에게 PARTY_INVITE 알림을 보내고, 회원은 알림함에서 수락(바로 파티원)·거절합니다.
   */
  async function invite(rawPostId, memberId, body) {
    const { memberId: inviteeId } = validateInvite(body);
    const post = await loadOwnedPost(rawPostId, memberId);
    if (inviteeId === memberId) throw new ApiError(400, 'CANNOT_INVITE_SELF', m.cannotInviteSelf);
    if (post.currentCount >= post.headcount) throw new ApiError(409, 'PARTY_FULL', m.partyFull);
    if (post.status === POST_STATUS.paused) throw new ApiError(409, 'POST_PAUSED', m.postPaused);
    if (post.status !== POST_STATUS.open) throw new ApiError(409, 'POST_CLOSED', m.postClosed);

    const invitee = await partyRepository.findMemberStatus(inviteeId);
    if (!invitee || invitee.status === MEMBER_STATUS.withdrawn) throw new ApiError(404, 'MEMBER_NOT_FOUND', m.memberNotFound);
    try {
      assertCanApply(invitee, now());
    } catch {
      throw new ApiError(409, 'INVITEE_UNAVAILABLE', m.inviteeUnavailable);
    }

    const existing = await partyRepository.findMyApplication(post.id, inviteeId);
    if (existing && [S.pending, S.accepted].includes(existing.status)) throw new ApiError(409, 'ALREADY_IN_PARTY', m.alreadyInParty);
    if (existing && existing.status !== S.canceled) throw new ApiError(409, 'INVITE_NOT_ALLOWED', m.inviteNotAllowed);
    const alreadyInvited = () => new ApiError(409, 'ALREADY_INVITED', m.alreadyInvited);
    const invitation = await partyRepository.findInvitation(post.id, inviteeId);
    if (invitation?.status === I.pending) throw alreadyInvited();

    const host = await partyRepository.findMemberStatus(memberId);
    const created = await partyRepository.createInvitation({
      postId: post.id,
      inviterId: memberId,
      inviteeId,
      notice: m.notice.invited(host?.nickname ?? m.withdrawnMember, clipTitle(post.title)),
    });
    if (!created) throw alreadyInvited();
  }

  /**
   * PATCH /api/posts/:postId/invitations/me — 받은 초대에 응답합니다 { status: ACCEPTED | DECLINED }.
   * 수락하면 파티장 승인 없이 바로 파티원(ACCEPTED)이 됩니다.
   */
  async function respondInvitation(rawPostId, memberId, body) {
    const { status } = validateInvitationResponse(body);
    const invitee = await partyRepository.findMemberStatus(memberId);
    if (status === I.accepted) assertCanApply(invitee, now());
    const post = await loadPost(rawPostId);

    const nickname = invitee?.nickname ?? m.withdrawnMember;
    const title = clipTitle(post.title);
    const outcome = await partyRepository.respondInvitation({
      postId: post.id,
      inviteeId: memberId,
      status,
      respondedAt: now(),
      notices: { accepted: m.notice.inviteAccepted(nickname, title), declined: m.notice.inviteDeclined(nickname, title), closed: m.notice.closed(title) },
    });
    switch (outcome.result) {
      case 'OK':
        if (status === I.accepted) changed(post.id);
        return { postId: post.id, status, current: outcome.current, max: outcome.max, postStatus: outcome.postStatus };
      case 'ALREADY_RESPONDED':
        throw new ApiError(409, 'ALREADY_RESPONDED', m.alreadyResponded);
      case 'POST_CLOSED':
        throw new ApiError(409, 'POST_CLOSED', m.postClosed);
      case 'FULL':
        throw new ApiError(409, 'PARTY_FULL', m.partyFull);
      case 'ALREADY_JOINED':
        throw new ApiError(409, 'ALREADY_IN_PARTY', m.alreadyJoined);
      case 'NOT_ALLOWED':
        throw new ApiError(409, 'INVITE_NOT_ALLOWED', m.joinNotAllowed);
      default:
        throw new ApiError(404, 'INVITATION_NOT_FOUND', m.invitationNotFound);
    }
  }

  return { apply, cancelMine, listApplications, decide, changeStatus, listParticipants, invite, respondInvitation };
}

module.exports = { createPartyService };
