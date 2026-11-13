'use strict';

/** 관리자 API 공통 값 (docs/API_SPEC.md 9절, docs/03-db-design.md 2.13절) */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const SEARCH_MAX_LENGTH = 50;

/** post.delete_reason · 댓글 처리 사유 (VARCHAR(200)) */
const REASON_MAX_LENGTH = 200;
/** sanction.reason · report.admin_memo (VARCHAR(500)) */
const LONG_TEXT_MAX_LENGTH = 500;
const SUSPEND_MAX_DAYS = 365;

/** 대시보드 "오늘" 은 한국 시간 자정 기준 (DB 는 UTC) */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_SANCTION_DAYS = 7;
const RECENT_SANCTION_LIMIT = 5;
/** 공고 상세 · 회원 상세에 붙이는 최근 처리 이력 개수 */
const DETAIL_LOG_LIMIT = 20;

const ADMIN_ACTIVE_STATUS = 'ACTIVE';

/** report.status — 화면의 접수 · 처리 중 · 완료 · 기각 */
const reportStatus = Object.freeze({
  pending: 'PENDING',
  inProgress: 'IN_PROGRESS',
  done: 'DONE',
  rejected: 'REJECTED',
});
const reportStatuses = Object.freeze(Object.values(reportStatus));
/** 처리가 끝나 더 바꿀 수 없는 상태 */
const closedReportStatuses = Object.freeze([reportStatus.done, reportStatus.rejected]);
/** PATCH 로 바꿀 수 있는 상태 (PENDING 으로 되돌리기는 불가) */
const reportUpdateStatuses = Object.freeze([reportStatus.inProgress, reportStatus.done, reportStatus.rejected]);

/** report.target_type */
const reportTargetType = Object.freeze({
  member: 'MEMBER',
  noShow: 'NO_SHOW',
  post: 'POST',
  comment: 'COMMENT',
});
const reportTargetTypes = Object.freeze(Object.values(reportTargetType));

/** report.action — DONE 으로 처리할 때 고르는 조치. 기각은 DISMISS 로 기록 */
const reportAction = Object.freeze({
  warn: 'WARN',
  suspend: 'SUSPEND',
  ban: 'BAN',
  deleteContent: 'DELETE_CONTENT',
  dismiss: 'DISMISS',
});
const reportDoneActions = Object.freeze([
  reportAction.warn,
  reportAction.suspend,
  reportAction.ban,
  reportAction.deleteContent,
]);

/** sanction.type */
const sanctionType = Object.freeze({ warning: 'WARNING', suspend: 'SUSPEND', ban: 'BAN' });
const sanctionTypes = Object.freeze(Object.values(sanctionType));
const reportActionSanctions = Object.freeze({
  [reportAction.warn]: sanctionType.warning,
  [reportAction.suspend]: sanctionType.suspend,
  [reportAction.ban]: sanctionType.ban,
});

/** member.status — 화면의 정상 · 경고 · 이용 정지 · 영구 정지 · 탈퇴 */
const memberStatus = Object.freeze({
  active: 'ACTIVE',
  warned: 'WARNED',
  suspended: 'SUSPENDED',
  banned: 'BANNED',
  withdrawn: 'WITHDRAWN',
});
const memberStatuses = Object.freeze(Object.values(memberStatus));
/** 제재 후 회원 상태. 이미 더 무거운 상태면 낮추지 않습니다 (경고가 정지를 풀지 않음). */
const sanctionMemberStatus = Object.freeze({
  [sanctionType.warning]: memberStatus.warned,
  [sanctionType.suspend]: memberStatus.suspended,
  [sanctionType.ban]: memberStatus.banned,
});
const memberStatusSeverity = Object.freeze({
  [memberStatus.active]: 0,
  [memberStatus.warned]: 1,
  [memberStatus.suspended]: 2,
  [memberStatus.banned]: 3,
});

/** post.status — 화면의 모집 중 · 마감 · 종료 · 삭제됨 */
const postStatus = Object.freeze({ open: 'OPEN', closed: 'CLOSED', completed: 'COMPLETED', deleted: 'DELETED' });
const postStatuses = Object.freeze(Object.values(postStatus));

/** comment.status */
const commentStatus = Object.freeze({ visible: 'VISIBLE', hidden: 'HIDDEN', deleted: 'DELETED' });
const commentUpdateStatuses = Object.freeze(Object.values(commentStatus));
/** 관리자 목록의 댓글 상태. REPORTED 는 VISIBLE 이면서 신고가 1건 이상인 댓글 (화면의 신고됨) */
const COMMENT_REPORTED = 'REPORTED';
const commentFilterStatuses = Object.freeze([
  commentStatus.visible,
  COMMENT_REPORTED,
  commentStatus.hidden,
  commentStatus.deleted,
]);

/** admin_action_log.action_type */
const actionType = Object.freeze({
  login: 'ADMIN_LOGIN',
  reportProcess: 'REPORT_PROCESS',
  postDelete: 'POST_DELETE',
  commentHide: 'COMMENT_HIDE',
  commentRestore: 'COMMENT_RESTORE',
  commentDelete: 'COMMENT_DELETE',
  memberSanction: 'MEMBER_SANCTION',
  memberView: 'MEMBER_VIEW',
});
const commentActionTypes = Object.freeze({
  [commentStatus.hidden]: actionType.commentHide,
  [commentStatus.visible]: actionType.commentRestore,
  [commentStatus.deleted]: actionType.commentDelete,
});

/** GET /api/admin/history 의 kind → action_type 목록 (화면의 처리 이력 탭) */
const historyKinds = Object.freeze({
  REPORT: [actionType.reportProcess],
  POST_DELETE: [actionType.postDelete],
  COMMENT: [actionType.commentHide, actionType.commentRestore, actionType.commentDelete],
  SANCTION: [actionType.memberSanction],
  MEMBER_VIEW: [actionType.memberView],
  LOGIN: [actionType.login],
});
const actionTypeKinds = Object.freeze(
  Object.fromEntries(
    Object.entries(historyKinds).flatMap(([kind, types]) => types.map((type) => [type, kind])),
  ),
);

/** admin_action_log.target_type */
const logTargetType = Object.freeze({
  admin: 'ADMIN',
  report: 'REPORT',
  post: 'POST',
  comment: 'COMMENT',
  member: 'MEMBER',
});

/** notification.type */
const notificationType = Object.freeze({ postDeleted: 'POST_DELETED', sanction: 'SANCTION' });

const adminMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  userIdRequired: '아이디를 입력해주세요.',
  passwordRequired: '비밀번호를 입력해주세요.',
  invalidCredentials: '아이디 또는 비밀번호가 일치하지 않습니다.',
  adminInactive: '사용할 수 없는 관리자 계정입니다.',
  idInvalid: 'id 는 1 이상의 정수여야 합니다.',
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_PAGE_SIZE} 사이의 정수여야 합니다.`,
  qInvalid: `검색어는 ${SEARCH_MAX_LENGTH}자 이하로 입력해주세요.`,
  oneOf: (values) => `${values.join(', ')} 중 하나여야 합니다.`,
  reasonRequired: '사유를 입력해주세요.',
  reasonTooLong: (max) => `사유는 ${max}자 이하로 입력해주세요.`,
  memoTooLong: `메모는 ${LONG_TEXT_MAX_LENGTH}자 이하로 입력해주세요.`,
  actionRequired: '처리 완료(DONE)에는 조치(action)를 선택해야 합니다.',
  actionNotAllowed: '처리 완료(DONE)일 때만 조치(action)를 지정할 수 있습니다.',
  daysInvalid: `정지 기간(days)은 1~${SUSPEND_MAX_DAYS} 사이의 정수여야 합니다.`,
  daysNotAllowed: '정지 기간(days)은 이용 정지(SUSPEND)일 때만 지정할 수 있습니다.',
  reportNotFound: '존재하지 않는 신고입니다.',
  reportAlreadyHandled: '이미 처리가 끝난 신고입니다.',
  deleteContentNotAllowed: '공고 또는 댓글 신고에만 게시물 삭제 조치를 할 수 있습니다.',
  postNotFound: '존재하지 않는 공고입니다.',
  postAlreadyDeleted: '이미 삭제된 공고입니다.',
  memberNotFound: '존재하지 않는 회원입니다.',
  memberWithdrawn: '탈퇴한 회원은 제재할 수 없습니다.',
  memberAlreadyBanned: '이미 영구 정지된 회원입니다.',
  commentNotFound: '존재하지 않는 댓글입니다.',
  commentAlreadyDeleted: '이미 삭제된 댓글은 상태를 바꿀 수 없습니다.',
  commentStatusUnchanged: '이미 같은 상태인 댓글입니다.',
  /** 회원 알림함 문구 (notification.message, VARCHAR(200)) */
  postDeletedNotice: (title, reason) => `관리자에 의해 공고 "${title}" 이(가) 삭제되었습니다. 사유: ${reason}`,
  sanctionNotice: (label, reason) => `${label} 조치를 받았습니다. 사유: ${reason}`,
  sanctionLabel: (type, days) =>
    ({ WARNING: '경고', SUSPEND: `이용 정지 (${days}일)`, BAN: '영구 정지' })[type],
});

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  REASON_MAX_LENGTH,
  LONG_TEXT_MAX_LENGTH,
  SUSPEND_MAX_DAYS,
  KST_OFFSET_MS,
  DAY_MS,
  RECENT_SANCTION_DAYS,
  RECENT_SANCTION_LIMIT,
  DETAIL_LOG_LIMIT,
  ADMIN_ACTIVE_STATUS,
  reportStatus,
  reportStatuses,
  closedReportStatuses,
  reportUpdateStatuses,
  reportTargetType,
  reportTargetTypes,
  reportAction,
  reportDoneActions,
  sanctionType,
  sanctionTypes,
  reportActionSanctions,
  memberStatus,
  memberStatuses,
  sanctionMemberStatus,
  memberStatusSeverity,
  postStatus,
  postStatuses,
  commentStatus,
  commentUpdateStatuses,
  COMMENT_REPORTED,
  commentFilterStatuses,
  actionType,
  commentActionTypes,
  historyKinds,
  actionTypeKinds,
  logTargetType,
  notificationType,
  adminMessages,
};
