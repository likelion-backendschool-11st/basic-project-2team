'use strict';

/** comment.status 값 (docs/03-db-design.md 2.10). HIDDEN 은 관리자 가림 — 목록에는 나오고 프론트에서 접어 둡니다. */
const COMMENT_STATUS = Object.freeze({
  visible: 'VISIBLE',
  hidden: 'HIDDEN',
  deleted: 'DELETED',
});

/** 댓글 입력 규칙 (frontend/src/data/commentData.ts commentText.max, comment.content VARCHAR(500)) */
const COMMENT_MAX_LENGTH = 500;

/** GET /api/posts/{postId}/comments 조회 규칙 (docs/API_SPEC.md 5절) */
const COMMENT_SORTS = Object.freeze(['oldest', 'newest']);
const DEFAULT_COMMENT_SORT = 'oldest';
/** frontend/src/data/commentData.ts COMMENT_PAGE_SIZE */
const DEFAULT_COMMENT_PAGE_SIZE = 4;
const MAX_COMMENT_PAGE_SIZE = 50;

/**
 * 댓글 채널. public 은 누구나 보는 일반 댓글, party 는 참가가 확정된 파티원(공대장 + 승인된 파티원)만 보고 쓰는 댓글입니다.
 * comment.is_party_only 로 저장하고, 답글은 부모 댓글의 채널을 따릅니다.
 */
const COMMENT_CHANNELS = Object.freeze({ public: 'public', party: 'party' });
const DEFAULT_COMMENT_CHANNEL = COMMENT_CHANNELS.public;

/** 댓글을 쓸 수 없는 회원 상태 (정지 기간이 지난 SUSPENDED 는 허용) */
const MEMBER_STATUS = Object.freeze({
  suspended: 'SUSPENDED',
  banned: 'BANNED',
  withdrawn: 'WITHDRAWN',
});

/** POST /api/reports (docs/API_SPEC.md 6절) */
const REPORT_TARGET_TYPES = Object.freeze({ comment: 'COMMENT', member: 'MEMBER', post: 'POST', noShow: 'NO_SHOW' });
/** frontend/src/data/commentData.ts reportReasons. report.reason_code 에 이 문구 그대로 저장합니다 (관리자 화면이 그대로 표시). */
const REPORT_REASONS = Object.freeze(['욕설 및 비하 발언', '스팸 / 도배', '부적절한 광고', '개인정보 노출', '기타']);
/** 노쇼 신고 사유 (frontend/src/data/postData.ts noShowReasons) */
const NO_SHOW_REPORT_REASONS = Object.freeze(['연락 없이 불참', '약속 시간 지각', '시작 후 무단 이탈', '기타']);
const REPORT_DETAIL_MAX_LENGTH = 500;
/** 서로 다른 신고자 수가 이 값 이상이면 댓글을 HIDDEN 으로 자동 가림 (REQ-REPORT-004, docs/03-db-design.md 2.10) */
const COMMENT_HIDE_REPORT_COUNT = 5;

const commentMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  textRequired: '댓글 내용을 입력해주세요.',
  textTooLong: `댓글은 ${COMMENT_MAX_LENGTH}자 이하로 입력해주세요.`,
  secretInvalid: 'secret 은 true/false 여야 합니다.',
  parentIdInvalid: 'parentId 는 1 이상의 정수여야 합니다.',
  sortInvalid: `sort 는 ${COMMENT_SORTS.join(', ')} 중 하나여야 합니다.`,
  pageInvalid: 'page 는 1 이상의 정수여야 합니다.',
  sizeInvalid: `size 는 1~${MAX_COMMENT_PAGE_SIZE} 사이의 정수여야 합니다.`,
  parentNotFound: '답글을 달 댓글이 존재하지 않습니다.',
  replyDepthExceeded: '답글에는 다시 답글을 달 수 없습니다.',
  accountSuspended: '이용이 정지된 계정입니다.',
  accountBanned: '영구 정지된 계정입니다.',
  unauthorized: '로그인이 필요합니다.',
  withdrawnAuthor: '탈퇴한 회원',
  commentNotFound: '존재하지 않는 댓글입니다.',
  channelInvalid: `channel 은 ${Object.values(COMMENT_CHANNELS).join(', ')} 중 하나여야 합니다.`,
  partyOnly: '참가가 확정된 파티원만 볼 수 있는 댓글입니다.',
  notCommentAuthor: '본인이 작성한 댓글만 수정·삭제할 수 있습니다.',
  commentHidden: '관리자가 가린 댓글은 수정할 수 없습니다.',
  targetTypeInvalid: `현재는 ${Object.values(REPORT_TARGET_TYPES).join(', ')} 신고만 접수할 수 있습니다.`,
  targetIdInvalid: 'targetId 는 1 이상의 정수여야 합니다.',
  reasonInvalid: `reason 은 ${REPORT_REASONS.join(', ')} 중 하나여야 합니다.`,
  noShowReasonInvalid: `reason 은 ${NO_SHOW_REPORT_REASONS.join(', ')} 중 하나여야 합니다.`,
  postIdInvalid: 'postId 는 1 이상의 정수여야 합니다.',
  detailTooLong: `상세 사유는 ${REPORT_DETAIL_MAX_LENGTH}자 이하로 입력해주세요.`,
  cannotReportSelf: '본인이 작성한 댓글은 신고할 수 없습니다.',
  alreadyReported: '이미 신고한 댓글입니다.',
  memberNotFound: '존재하지 않거나 탈퇴한 회원입니다.',
  cannotReportSelfMember: '본인은 신고할 수 없습니다.',
  alreadyReportedMember: '이미 신고한 회원입니다.',
  cannotReportOwnPost: '본인이 작성한 공고는 신고할 수 없습니다.',
  alreadyReportedPost: '이미 신고한 공고입니다.',
  notPartyMember: '참가가 확정된 파티원만 노쇼를 신고할 수 있습니다.',
  noShowTargetNotFound: '이 파티에서 승인된 파티원만 노쇼로 신고할 수 있습니다.',
  noShowTooEarly: '출발 시간이 지나거나 활동이 완료된 뒤에 노쇼를 신고할 수 있습니다.',
  alreadyReportedNoShow: '이미 노쇼로 신고한 파티원입니다.',
  notParentAuthor: '답글이 달린 댓글의 작성자만 답글을 채택할 수 있습니다.',
  notAReply: '답글만 채택할 수 있습니다.',
  cannotAcceptOwn: '본인이 작성한 답글은 채택할 수 없습니다.',
  cannotAcceptSecret: '비밀 댓글은 채택할 수 없습니다.',
  cannotAcceptHidden: '관리자가 가린 댓글은 채택할 수 없습니다.',
});

module.exports = {
  COMMENT_CHANNELS,
  DEFAULT_COMMENT_CHANNEL,
  COMMENT_STATUS,
  COMMENT_MAX_LENGTH,
  COMMENT_SORTS,
  DEFAULT_COMMENT_SORT,
  DEFAULT_COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
  MEMBER_STATUS,
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  NO_SHOW_REPORT_REASONS,
  REPORT_DETAIL_MAX_LENGTH,
  COMMENT_HIDE_REPORT_COUNT,
  commentMessages,
};
