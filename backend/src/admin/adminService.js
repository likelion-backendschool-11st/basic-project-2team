'use strict';

const bcrypt = require('bcryptjs');
const { ApiError } = require('../common/ApiError');
const {
  KST_OFFSET_MS,
  DAY_MS,
  RECENT_SANCTION_DAYS,
  RECENT_SANCTION_LIMIT,
  DETAIL_LOG_LIMIT,
  ADMIN_ACTIVE_STATUS,
  reportStatus,
  closedReportStatuses,
  reportTargetType,
  reportAction,
  reportActionSanctions,
  sanctionType,
  memberStatus,
  sanctionMemberStatus,
  memberStatusSeverity,
  postStatus,
  commentStatus,
  COMMENT_REPORTED,
  actionType,
  commentActionTypes,
  historyKinds,
  actionTypeKinds,
  logTargetType,
  notificationType,
  adminMessages,
} = require('./adminConstants');
const {
  validateReportListQuery,
  validatePostListQuery,
  validateMemberListQuery,
  validateCommentListQuery,
  validateHistoryQuery,
  validateAdminLogin,
  validateReportUpdate,
  validatePostDelete,
  validateSanction,
  validateCommentUpdate,
} = require('./adminValidator');

/** 존재하지 않는 아이디에도 bcrypt 비교를 한 번 해서, 응답 시간으로 아이디 존재 여부를 알 수 없게 합니다. */
const DUMMY_PASSWORD = 'ourparty-dummy-password';

const notFound = (code, message) => new ApiError(404, code, message);
const conflict = (code, message) => new ApiError(409, code, message);

/** notification.message 는 VARCHAR(200). 사유가 길면 잘라서 저장합니다. */
const NOTIFICATION_MAX_LENGTH = 200;
const truncate = (text, max) => {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
};

/** mysql2 는 DECIMAL 을 문자열로 줍니다. */
const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

/** 페이지네이션 응답 `{ items, page, size, totalCount, totalPages }` (docs/API_SPEC.md 1절) */
const toPage = ({ items, totalCount }, { page, size }, mapItem) => ({
  items: items.map(mapItem),
  page,
  size,
  totalCount,
  totalPages: Math.ceil(totalCount / size),
});

/** 한국 시간 기준 오늘 0시를 UTC Date 로 */
const startOfKstDay = (now) =>
  new Date(Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS);

/** 댓글의 화면 상태: VISIBLE 이면서 신고가 있으면 REPORTED */
const commentViewStatus = (comment) =>
  comment.status === commentStatus.visible && Number(comment.reportCount) > 0 ? COMMENT_REPORTED : comment.status;

const toSanction = (row) => ({
  id: row.id,
  type: row.type,
  reason: row.reason,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  reportId: row.reportId,
  releasedAt: row.releasedAt,
  adminName: row.adminName,
  createdAt: row.createdAt,
});

const toLog = (row) => ({
  id: row.id,
  createdAt: row.createdAt,
  actionType: row.actionType,
  adminName: row.adminName,
  detail: row.detail ?? null,
});

const toPostItem = (row) => ({
  id: row.id,
  createdAt: row.createdAt,
  category: row.category,
  game: row.gameName,
  gameCode: row.gameCode,
  partyType: row.partyType,
  content: row.contentName,
  title: row.title,
  author: { id: row.authorId, nickname: row.authorNickname },
  current: row.currentCount,
  max: row.headcount,
  status: row.status,
  reportCount: Number(row.reportCount),
});

/**
 * 관리자 페이지 비즈니스 로직 (docs/API_SPEC.md 9절).
 * 처리(신고·공고 삭제·제재·댓글)는 대상 행을 잠그는 트랜잭션 안에서 하고, admin_action_log 에 이력을 남깁니다.
 * @param {{
 *   adminRepository: ReturnType<typeof import('./adminRepository').createAdminRepository>,
 *   tokenProvider: ReturnType<typeof import('../common/tokenProvider').createTokenProvider>,
 *   bcryptRounds: number,
 *   now?: () => Date,
 * }} deps
 */
function createAdminService({ adminRepository, tokenProvider, bcryptRounds, now = () => new Date() }) {
  let dummyHash;
  const getDummyHash = () => (dummyHash ??= bcrypt.hash(DUMMY_PASSWORD, bcryptRounds));

  // ───────── 인증

  /** POST /api/admin/auth/login — 관리자 전용 계정으로 로그인하고 관리자 토큰을 발급합니다 (REQ-ADMIN-001). */
  async function login(body, { ip }) {
    const input = validateAdminLogin(body);
    const admin = await adminRepository.findAdminByLoginId(input.userId);
    if (!admin) {
      await bcrypt.compare(input.password, await getDummyHash());
      throw new ApiError(401, 'INVALID_CREDENTIALS', adminMessages.invalidCredentials);
    }
    if (!(await bcrypt.compare(input.password, admin.passwordHash))) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', adminMessages.invalidCredentials);
    }
    if (admin.status !== ADMIN_ACTIVE_STATUS) throw new ApiError(403, 'ADMIN_INACTIVE', adminMessages.adminInactive);

    await adminRepository.recordAdminLogin({ adminId: admin.id, now: now() });
    await adminRepository.insertActionLog({
      adminId: admin.id,
      actionType: actionType.login,
      targetType: logTargetType.admin,
      targetId: admin.id,
      detail: null,
      ip,
    });
    return {
      accessToken: tokenProvider.createAdminAccessToken(admin.id),
      admin: { id: admin.id, userId: admin.loginId, name: admin.name, role: admin.role },
    };
  }

  /** 토큰의 관리자가 지금도 사용 가능한 계정인지 확인합니다 (requireAdmin 다음 단계). */
  async function getActiveAdmin(adminId) {
    const admin = await adminRepository.findAdminById(adminId);
    if (!admin || admin.status !== ADMIN_ACTIVE_STATUS) {
      throw new ApiError(403, 'ADMIN_INACTIVE', adminMessages.adminInactive);
    }
    return { id: admin.id, userId: admin.loginId, name: admin.name, role: admin.role };
  }

  // ───────── 대시보드

  /** GET /api/admin/dashboard */
  async function getDashboard() {
    const current = now();
    const counts = await adminRepository.getDashboardCounts({
      todayStart: startOfKstDay(current),
      recentSince: new Date(current.getTime() - RECENT_SANCTION_DAYS * DAY_MS),
    });
    const recent = await adminRepository.listRecentSanctions(RECENT_SANCTION_LIMIT);
    return {
      pendingReportCount: Number(counts.pendingReportCount),
      todayReportCount: Number(counts.todayReportCount),
      openPostCount: Number(counts.openPostCount),
      recentSanctionCount: Number(counts.recentSanctionCount),
      recentSanctionDays: RECENT_SANCTION_DAYS,
      recentSanctions: recent.map((row) => ({
        id: row.id,
        member: { id: row.memberId, nickname: row.nickname, userId: row.loginId },
        type: row.type,
        reason: row.reason,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        createdAt: row.createdAt,
      })),
    };
  }

  // ───────── 공통 처리 (트랜잭션 안에서 호출)

  /**
   * 회원 제재: sanction 추가 → 회원 상태 갱신 → 알림. 이미 더 무거운 상태면 상태를 낮추지 않고,
   * 정지가 겹치면 더 늦게 끝나는 쪽을 남깁니다.
   */
  async function applySanction(tx, { memberId, type, days, reason, reportId, admin, current }) {
    const member = await tx.lockMember(memberId);
    if (!member) throw notFound('MEMBER_NOT_FOUND', adminMessages.memberNotFound);
    if (member.status === memberStatus.withdrawn) throw conflict('MEMBER_WITHDRAWN', adminMessages.memberWithdrawn);
    if (member.status === memberStatus.banned) throw conflict('MEMBER_ALREADY_BANNED', adminMessages.memberAlreadyBanned);

    const endsAt = type === sanctionType.suspend ? new Date(current.getTime() + days * DAY_MS) : null;
    const sanctionId = await tx.insertSanction({
      memberId,
      type,
      reason,
      startsAt: current,
      endsAt,
      reportId,
      adminId: admin.id,
    });

    const nextStatus = sanctionMemberStatus[type];
    const status =
      memberStatusSeverity[nextStatus] > memberStatusSeverity[member.status] ? nextStatus : member.status;
    let suspendedUntil = status === memberStatus.suspended ? member.suspendedUntil : null;
    if (endsAt && status === memberStatus.suspended && (!suspendedUntil || endsAt > suspendedUntil)) {
      suspendedUntil = endsAt;
    }
    await tx.updateMemberStatus({ id: memberId, status, suspendedUntil });

    const label = adminMessages.sanctionLabel(type, days);
    await tx.insertNotification({
      memberId,
      type: notificationType.sanction,
      message: truncate(adminMessages.sanctionNotice(label, reason), NOTIFICATION_MAX_LENGTH),
      postId: null,
    });
    return { sanctionId, member, label, status, suspendedUntil };
  }

  /** 관리자 공고 삭제: 소프트 삭제 + 작성자에게 사유 알림 (REQ-ADMIN-003) */
  async function removePost(tx, { post, reason, admin, current }) {
    await tx.deletePost({ id: post.id, adminId: admin.id, reason, now: current });
    await tx.insertNotification({
      memberId: post.authorId,
      type: notificationType.postDeleted,
      message: truncate(adminMessages.postDeletedNotice(post.title, reason), NOTIFICATION_MAX_LENGTH),
      postId: post.id,
    });
  }

  async function changeCommentStatus(tx, { comment, status, current }) {
    const deleting = status === commentStatus.deleted;
    await tx.updateCommentStatus({ id: comment.id, status, deletedAt: deleting ? current : null });
    if (deleting) await tx.decrementCommentCount(comment.postId);
  }

  // ───────── 신고

  /** GET /api/admin/reports */
  async function listReports(query) {
    const input = validateReportListQuery(query);
    const result = await adminRepository.listReports({ ...input, limit: input.size });
    return toPage(result, input, (row) => ({
      id: row.id,
      createdAt: row.createdAt,
      type: row.targetType,
      targetId: row.targetId,
      reason: row.reasonCode,
      target: { id: row.targetMemberId, nickname: row.targetNickname },
      reporter: { id: row.reporterId, nickname: row.reporterNickname },
      status: row.status,
    }));
  }

  /** GET /api/admin/reports/{reportId} — 피신고 회원의 제재 이력을 함께 돌려줍니다. */
  async function getReport(reportId) {
    const row = await adminRepository.findReportById(reportId);
    if (!row) throw notFound('REPORT_NOT_FOUND', adminMessages.reportNotFound);
    const sanctions = await adminRepository.listSanctionsByMember(row.targetMemberId);
    return {
      id: row.id,
      createdAt: row.createdAt,
      type: row.targetType,
      targetId: row.targetId,
      reason: row.reasonCode,
      detail: row.detail,
      status: row.status,
      action: row.action,
      memo: row.adminMemo,
      handledBy: row.handledByName,
      handledAt: row.handledAt,
      reporter: { id: row.reporterId, nickname: row.reporterNickname, userId: row.reporterLoginId },
      target: {
        id: row.targetMemberId,
        nickname: row.targetNickname,
        userId: row.targetLoginId,
        mannerTemp: toNumber(row.targetMannerTemp),
        status: row.targetStatus,
      },
      post: row.postId ? { id: row.postId, title: row.postTitle } : null,
      comment: row.targetType === reportTargetType.comment ? { id: row.targetId, content: row.commentContent } : null,
      sanctions: sanctions.map(toSanction),
    };
  }

  /**
   * PATCH /api/admin/reports/{reportId}
   * DONE 이면 action 에 따라 제재(WARN/SUSPEND/BAN) 또는 대상 공고·댓글 삭제(DELETE_CONTENT) 까지 한 트랜잭션으로 처리합니다.
   */
  async function processReport(reportId, body, { admin, ip }) {
    const input = validateReportUpdate(body);
    const current = now();

    return adminRepository.withTransaction(async (tx) => {
      const report = await tx.lockReport(reportId);
      if (!report) throw notFound('REPORT_NOT_FOUND', adminMessages.reportNotFound);
      if (closedReportStatuses.includes(report.status)) {
        throw conflict('REPORT_ALREADY_HANDLED', adminMessages.reportAlreadyHandled);
      }

      const detail = { reason: input.memo ?? report.reasonCode, status: input.status, action: input.action };
      const sanction = reportActionSanctions[input.action];
      if (sanction) {
        const result = await applySanction(tx, {
          memberId: report.targetMemberId,
          type: sanction,
          days: input.days,
          reason: input.memo ?? report.reasonCode,
          reportId: report.id,
          admin,
          current,
        });
        Object.assign(detail, { targetLabel: result.member.nickname, sanctionId: result.sanctionId, days: input.days });
      } else if (input.action === reportAction.deleteContent) {
        detail.targetLabel = await deleteReportedContent(tx, report, input.memo ?? report.reasonCode, admin, current);
      }

      const closed = closedReportStatuses.includes(input.status);
      await tx.updateReport({
        id: report.id,
        status: input.status,
        action: input.action,
        memo: input.memo,
        adminId: admin.id,
        handledAt: closed ? current : null,
      });
      await tx.insertActionLog({
        adminId: admin.id,
        actionType: actionType.reportProcess,
        targetType: logTargetType.report,
        targetId: report.id,
        detail,
        ip,
      });
      return { id: report.id, status: input.status, action: input.action };
    });
  }

  /** 신고된 공고·댓글을 삭제합니다. 이미 삭제된 대상이면 삭제는 건너뜁니다. @returns 이력에 남길 대상 이름 */
  async function deleteReportedContent(tx, report, reason, admin, current) {
    if (report.targetType === reportTargetType.post) {
      const post = await tx.lockPost(report.targetId);
      if (!post) throw notFound('POST_NOT_FOUND', adminMessages.postNotFound);
      if (post.status !== postStatus.deleted) await removePost(tx, { post, reason, admin, current });
      return post.title;
    }
    if (report.targetType === reportTargetType.comment) {
      const comment = await tx.lockComment(report.targetId);
      if (!comment) throw notFound('COMMENT_NOT_FOUND', adminMessages.commentNotFound);
      if (comment.status !== commentStatus.deleted) {
        await changeCommentStatus(tx, { comment, status: commentStatus.deleted, current });
      }
      return `댓글 #${comment.id}`;
    }
    throw new ApiError(400, 'INVALID_REPORT_ACTION', adminMessages.deleteContentNotAllowed);
  }

  // ───────── 공고

  /** GET /api/admin/posts */
  async function listPosts(query) {
    const input = validatePostListQuery(query);
    const result = await adminRepository.listPosts({ ...input, limit: input.size });
    return toPage(result, input, toPostItem);
  }

  /** GET /api/admin/posts/{postId} — 이 공고에 대한 관리자 처리 이력을 함께 돌려줍니다. */
  async function getPost(postId) {
    const row = await adminRepository.findPostById(postId);
    if (!row) throw notFound('POST_NOT_FOUND', adminMessages.postNotFound);
    const [logs, reports] = await Promise.all([
      adminRepository.listActionLogsByTarget({
        targetType: logTargetType.post,
        targetId: postId,
        limit: DETAIL_LOG_LIMIT,
      }),
      adminRepository.listReportsByPost(postId),
    ]);
    const item = toPostItem(row);
    return {
      ...item,
      author: {
        ...item.author,
        userId: row.authorLoginId,
        mannerTemp: toNumber(row.authorMannerTemp),
        sanctionCount: Number(row.authorSanctionCount),
      },
      body: row.body,
      partyName: row.partyName,
      playStyle: row.playStyle,
      requiredSpec: row.requiredSpec,
      schedule: row.scheduleAt,
      voiceRequired: Boolean(row.voiceRequired),
      views: row.viewCount,
      commentCount: row.commentCount,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      deleteReason: row.deleteReason,
      deletedBy: row.deletedByName,
      logs: logs.map(toLog),
      reports: reports.map((report) => ({
        id: report.id,
        createdAt: report.createdAt,
        reason: report.reasonCode,
        status: report.status,
        reporter: report.reporterNickname,
      })),
    };
  }

  /** DELETE /api/admin/posts/{postId} */
  async function deletePost(postId, body, { admin, ip }) {
    const { reason } = validatePostDelete(body);
    const current = now();

    await adminRepository.withTransaction(async (tx) => {
      const post = await tx.lockPost(postId);
      if (!post) throw notFound('POST_NOT_FOUND', adminMessages.postNotFound);
      if (post.status === postStatus.deleted) throw conflict('POST_ALREADY_DELETED', adminMessages.postAlreadyDeleted);

      await removePost(tx, { post, reason, admin, current });
      await tx.insertActionLog({
        adminId: admin.id,
        actionType: actionType.postDelete,
        targetType: logTargetType.post,
        targetId: post.id,
        detail: { targetLabel: post.title, reason },
        ip,
      });
    });
  }

  // ───────── 회원

  /** GET /api/admin/members */
  async function listMembers(query) {
    const input = validateMemberListQuery(query);
    const result = await adminRepository.listMembers({ ...input, limit: input.size });
    return toPage(result, input, (row) => ({
      id: row.id,
      nickname: row.nickname,
      userId: row.loginId,
      joinedAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      mannerTemp: toNumber(row.mannerTemp),
      reportCount: Number(row.reportCount),
      sanctionCount: Number(row.sanctionCount),
      status: row.status,
      suspendedUntil: row.suspendedUntil,
    }));
  }

  /** GET /api/admin/members/{memberId} — 개인정보를 보는 화면이라 조회 기록을 남깁니다 (REQ-ADMIN-007 접근 기록). */
  async function getMember(memberId, { admin, ip }) {
    const row = await adminRepository.findMemberById(memberId);
    if (!row) throw notFound('MEMBER_NOT_FOUND', adminMessages.memberNotFound);
    const [games, sanctions] = await Promise.all([
      adminRepository.listGameProfiles(memberId),
      adminRepository.listSanctionsByMember(memberId),
    ]);

    await adminRepository.insertActionLog({
      adminId: admin.id,
      actionType: actionType.memberView,
      targetType: logTargetType.member,
      targetId: memberId,
      detail: { targetLabel: row.nickname ?? `회원 #${memberId}` },
      ip,
    });

    return {
      id: row.id,
      userId: row.loginId,
      nickname: row.nickname,
      email: row.email,
      phone: row.phone,
      name: row.name,
      ageRange: row.ageRange,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      status: row.status,
      suspendedUntil: row.suspendedUntil,
      mannerTemp: toNumber(row.mannerTemp),
      reviewCount: row.reviewCount,
      level: row.level,
      joinedAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      withdrawnAt: row.withdrawnAt,
      stats: {
        postCount: Number(row.postCount),
        partyCount: Number(row.partyCount),
        noShowCount: Number(row.noShowCount),
        reportCount: Number(row.reportCount),
      },
      games: games.map((game) => ({
        game: game.gameName,
        isMain: Boolean(game.isMain),
        characterName: game.characterName,
        playTimeSlot: game.playTimeSlot,
        playStyle: game.playStyle,
      })),
      sanctions: sanctions.map(toSanction),
    };
  }

  /** POST /api/admin/members/{memberId}/sanctions */
  async function sanctionMember(memberId, body, { admin, ip }) {
    const input = validateSanction(body);
    const current = now();

    return adminRepository.withTransaction(async (tx) => {
      const result = await applySanction(tx, { memberId, ...input, reportId: null, admin, current });
      await tx.insertActionLog({
        adminId: admin.id,
        actionType: actionType.memberSanction,
        targetType: logTargetType.member,
        targetId: memberId,
        detail: { targetLabel: result.member.nickname, type: input.type, days: input.days, reason: input.reason },
        ip,
      });
      return {
        id: result.sanctionId,
        memberId,
        type: input.type,
        memberStatus: result.status,
        suspendedUntil: result.suspendedUntil,
      };
    });
  }

  // ───────── 댓글

  /** GET /api/admin/comments — 관리자는 비밀 댓글 본문도 봅니다. */
  async function listComments(query) {
    const input = validateCommentListQuery(query);
    const result = await adminRepository.listComments({ ...input, limit: input.size });
    return toPage(result, input, (row) => ({
      id: row.id,
      createdAt: row.createdAt,
      post: { id: row.postId, title: row.postTitle },
      parentId: row.parentId,
      author: { id: row.authorId, nickname: row.authorNickname },
      text: row.content,
      secret: Boolean(row.isSecret),
      reportCount: Number(row.reportCount),
      status: commentViewStatus(row),
    }));
  }

  /** PATCH /api/admin/comments/{commentId} — HIDDEN(가림) / VISIBLE(복구) / DELETED(삭제) */
  async function updateComment(commentId, body, { admin, ip }) {
    const { status, reason } = validateCommentUpdate(body);
    const current = now();

    return adminRepository.withTransaction(async (tx) => {
      const comment = await tx.lockComment(commentId);
      if (!comment) throw notFound('COMMENT_NOT_FOUND', adminMessages.commentNotFound);
      if (comment.status === commentStatus.deleted) {
        throw conflict('COMMENT_ALREADY_DELETED', adminMessages.commentAlreadyDeleted);
      }
      if (comment.status === status) throw conflict('COMMENT_STATUS_UNCHANGED', adminMessages.commentStatusUnchanged);

      await changeCommentStatus(tx, { comment, status, current });
      await tx.insertActionLog({
        adminId: admin.id,
        actionType: commentActionTypes[status],
        targetType: logTargetType.comment,
        targetId: comment.id,
        detail: { targetLabel: `댓글 #${comment.id}`, postId: comment.postId, reason },
        ip,
      });
      return { id: comment.id, status };
    });
  }

  // ───────── 처리 이력

  /** GET /api/admin/history */
  async function listHistory(query) {
    const input = validateHistoryQuery(query);
    const { kind, size, ...filters } = input;
    const result = await adminRepository.listActionLogs({
      ...filters,
      actionTypes: kind ? historyKinds[kind] : null,
      limit: size,
    });
    return toPage(result, input, (row) => ({
      ...toLog(row),
      kind: actionTypeKinds[row.actionType] ?? null,
      targetType: row.targetType,
      targetId: row.targetId,
    }));
  }

  return {
    login,
    getActiveAdmin,
    getDashboard,
    listReports,
    getReport,
    processReport,
    listPosts,
    getPost,
    deletePost,
    listMembers,
    getMember,
    sanctionMember,
    listComments,
    updateComment,
    listHistory,
  };
}

module.exports = { createAdminService };
