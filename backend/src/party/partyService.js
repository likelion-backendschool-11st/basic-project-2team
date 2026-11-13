'use strict';

const { ApiError } = require('../common/ApiError');
const { APPLICATION_STATUS: S, POST_STATUS, MEMBER_STATUS, LATE_CANCEL_HOURS, partyMessages: m } = require('./partyConstants');
const { parseId, validateApply, validateDecision, parseListStatus } = require('./partyValidator');

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
function createPartyService({ partyRepository, now = () => new Date() }) {
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
    assertCanApply(await partyRepository.findMemberStatus(memberId), now());
    const post = await loadPost(rawPostId);

    if (post.authorId === memberId) throw new ApiError(403, 'CANNOT_APPLY_OWN_POST', m.cannotApplyOwnPost);
    if (post.status !== POST_STATUS.open) throw new ApiError(409, 'POST_CLOSED', m.postClosed);
    if (post.currentCount >= post.headcount) throw new ApiError(409, 'PARTY_FULL', m.partyFull);

    const existing = await partyRepository.findMyApplication(post.id, memberId);
    const alreadyApplied = () => new ApiError(409, 'ALREADY_APPLIED', m.alreadyApplied);
    if (existing) {
      if ([S.pending, S.accepted].includes(existing.status)) throw alreadyApplied();
      if (existing.status !== S.canceled) throw new ApiError(403, 'REAPPLY_NOT_ALLOWED', m.reapplyNotAllowed);
      if (!(await partyRepository.reapply({ id: existing.id, ...input }))) throw alreadyApplied();
      return { id: existing.id, status: S.pending };
    }

    const id = await partyRepository.createApplication({ postId: post.id, applicantId: memberId, ...input });
    if (id === null) throw alreadyApplied();
    return { id, status: S.pending };
  }

  /** DELETE /api/posts/:postId/applications/me */
  async function cancelMine(rawPostId, memberId) {
    const post = await loadPost(rawPostId);
    if (post.status === POST_STATUS.completed) throw new ApiError(409, 'POST_COMPLETED', m.cancelNotAllowed);

    const current = now();
    const lateCancel = post.scheduleAt ? new Date(post.scheduleAt).getTime() - current.getTime() <= LATE_CANCEL_HOURS * 3_600_000 : false;
    const canceled = await partyRepository.cancelApplication({ postId: post.id, applicantId: memberId, canceledAt: current, lateCancel });
    if (!canceled) throw applicationNotFound();
  }

  /** GET /api/posts/:postId/applications?status= — 작성자만 */
  async function listApplications(rawPostId, memberId, query) {
    const status = parseListStatus(query);
    const post = await loadOwnedPost(rawPostId, memberId);
    const rows = await partyRepository.findApplications(post.id, status);
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      role: row.role,
      message: row.message,
      appliedAt: toIso(row.appliedAt),
      applicant: toMember(row),
    }));
  }

  /** PATCH /api/posts/:postId/applications/:applicationId — 작성자만. PENDING 만 처리하고 승인하면 확정 인원이 늘어납니다. */
  async function decide(rawPostId, rawApplicationId, memberId, body) {
    const { status } = validateDecision(body);
    const post = await loadOwnedPost(rawPostId, memberId);
    const applicationId = parseId(rawApplicationId);
    if (applicationId === null) throw applicationNotFound();

    const outcome = await partyRepository.decideApplication({ postId: post.id, applicationId, status, decidedAt: now() });
    switch (outcome.result) {
      case 'OK':
        return { id: applicationId, status, current: outcome.current, max: outcome.max };
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

  /** GET /api/posts/:postId/participants — 파티장 + 수락된 파티원 */
  async function listParticipants(rawPostId) {
    const post = await loadPost(rawPostId);
    const rows = await partyRepository.findParticipants(post.id);
    return rows.map((row) => ({ ...toMember(row), role: row.role, isHost: Boolean(row.isHost) }));
  }

  return { apply, cancelMine, listApplications, decide, listParticipants };
}

module.exports = { createPartyService };
