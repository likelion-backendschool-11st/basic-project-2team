import type {
  AdminActionType,
  AdminHistory,
  CommentStatus,
  HistoryKind,
  MemberStatus,
  PostStatus,
  ProcessReportRequest,
  ReportAction,
  ReportStatus,
  ReportType,
  SanctionType,
} from '../api/adminApi';
import { paths, ROUTES } from './routes';

/** Stitch screens: 관리자 (대시보드, 신고/공고/회원/댓글 관리, 처리 이력 + 상세). 데이터는 /api/admin (docs/API_SPEC.md 9절) */

export type Tone = 'amber' | 'indigo' | 'emerald' | 'slate' | 'rose' | 'sky';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export const adminNav = [
  { label: '대시보드', to: ROUTES.admin, end: true },
  { label: '신고 관리', to: ROUTES.adminReports },
  { label: '공고 관리', to: ROUTES.adminPosts },
  { label: '회원 관리', to: ROUTES.adminMembers },
  { label: '댓글 관리', to: ROUTES.adminComments },
  { label: '처리 이력', to: ROUTES.adminHistory },
] as const;

export const adminText = {
  tag: '관리자 페이지',
  logout: '로그아웃',
  footer: '[OurParty] 관리자 페이지',
  terms: '이용약관',
  privacy: '개인정보처리방침',
  copy: '© 2026 OurParty Corp. All rights reserved.',
  search: '조회',
  reset: '초기화',
  sort: '정렬',
  prev: '이전',
  next: '다음',
  empty: '조건에 맞는 항목이 없습니다.',
  loading: '불러오는 중입니다…',
  retry: '다시 시도',
  detail: '상세 보기',
  withdrawn: '(탈퇴 회원)',
  none: '-',
};

export const adminLoginText = {
  icon: 'fa-solid fa-user-shield',
  title: '관리자 로그인',
  subtitle: '관리자 전용 계정으로 로그인해 주세요.',
  userId: { id: 'admin-user-id', label: '관리자 아이디', placeholder: '아이디를 입력하세요', icon: 'fa-regular fa-user', autoComplete: 'username' },
  password: { id: 'admin-password', label: '비밀번호', placeholder: '비밀번호를 입력하세요', icon: 'fa-solid fa-lock', autoComplete: 'current-password' },
  required: '아이디와 비밀번호를 입력해 주세요.',
  submit: '로그인',
  submitting: '로그인 중…',
  submitIcon: 'fa-solid fa-arrow-right',
  backHome: '서비스 홈으로',
};

/** 목록 페이지당 행 수 */
export const ADMIN_PAGE_SIZE = 10;
/** 공고 삭제 · 댓글 처리 사유 (post.delete_reason VARCHAR(200)) */
export const REASON_MAX_LENGTH = 200;
/** 신고 처리 메모 (report.admin_memo VARCHAR(500)) */
export const MEMO_MAX_LENGTH = 500;

// ───────── 표시 형식

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO 시각 → 브라우저 시간대 기준 "2026.03.31 16:42". 값이 없으면 "-" */
export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return adminText.none;
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 탈퇴 회원은 닉네임이 없습니다. */
export const displayName = (nickname: string | null | undefined) => nickname ?? adminText.withdrawn;

/** 하이픈 없이 저장된 휴대폰 번호 → 010-1234-5678 */
export const formatPhone = (phone: string | null) =>
  phone ? phone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : adminText.none;

const toOptions = <T extends string>(labels: Record<T, string>): readonly SelectOption[] =>
  Object.entries<string>(labels).map(([value, label]) => ({ value, label }));

// ───────── 신고

export const reportStatusLabel: Record<ReportStatus, string> = { PENDING: '접수', IN_PROGRESS: '처리 중', DONE: '완료', REJECTED: '기각' };
export const reportStatusTone: Record<ReportStatus, Tone> = { PENDING: 'amber', IN_PROGRESS: 'indigo', DONE: 'emerald', REJECTED: 'slate' };
export const reportTypeLabel: Record<ReportType, string> = { MEMBER: '유저', NO_SHOW: '노쇼', POST: '공고', COMMENT: '댓글' };
export const reportStatusOptions = toOptions(reportStatusLabel);
export const reportTypeOptions = toOptions(reportTypeLabel);
export const reportActionLabel: Record<ReportAction, string> = {
  WARN: '경고 조치',
  SUSPEND: '이용 정지',
  BAN: '영구 정지',
  DELETE_CONTENT: '게시물 삭제',
  DISMISS: '기각',
};

export const suspendPeriods = [
  { days: 1, label: '1일 정지' },
  { days: 3, label: '3일 정지' },
  { days: 7, label: '7일 정지 (운영원칙 2차 위반 기준 권장)' },
  { days: 30, label: '30일 정지' },
] as const;
export const DEFAULT_SUSPEND_DAYS = 7;

export type DecisionId = 'dismiss' | 'warn' | 'suspend' | 'ban' | 'delete';

interface Decision {
  readonly id: DecisionId;
  readonly title: string;
  readonly desc: string;
  readonly recommended?: boolean;
  /** 공고·댓글 신고에만 고를 수 있음 */
  readonly contentOnly?: boolean;
  readonly request: ProcessReportRequest;
}

/** 신고 처리 결정 → PATCH /api/admin/reports/{id} 본문 */
export const decisions: readonly Decision[] = [
  { id: 'dismiss', title: '기각', desc: '허위 신고 또는 위반 사항이 확인되지 않음', request: { status: 'REJECTED' } },
  { id: 'warn', title: '경고 조치', desc: '경미한 1차 단순 위반 및 주의 통지', request: { status: 'DONE', action: 'WARN' } },
  { id: 'suspend', title: '이용 정지', desc: '기간을 지정하여 파티 생성 및 참여 일시적 차단', recommended: true, request: { status: 'DONE', action: 'SUSPEND' } },
  { id: 'ban', title: '영구 정지', desc: '계정 영구 접속 박탈 (책임 관리자 전용)', request: { status: 'DONE', action: 'BAN' } },
  { id: 'delete', title: '공고 또는 댓글 단건 삭제', desc: '해당 게시물을 비공개 처리 (공고·댓글 신고만)', contentOnly: true, request: { status: 'DONE', action: 'DELETE_CONTENT' } },
];

export const reportDetailText = {
  title: '신고 상세',
  back: '신고 목록으로 돌아가기',
  pendingBadge: '접수 완료 (검토 대기)',
  info: '신고 정보',
  description: '신고 사유 및 설명',
  noDescription: '신고자가 남긴 설명이 없습니다.',
  target: '신고 대상 정보',
  evidence: '신고된 공고 또는 댓글 원문',
  evidenceNone: '회원·노쇼 신고는 원문이 없습니다.',
  toMember: '회원 상세 관리 기록으로 이동 →',
  toPost: '공고 상세로 이동 →',
  decision: '신고 처리 결정',
  period: '정지 기간',
  memo: '처리 사유',
  memoRequired: '처리 사유를 입력해 주세요.',
  markInProgress: '처리 중으로 표시',
  submit: '처리하기',
  cancel: '취소',
  confirmTitle: '이 신고를 처리할까요?',
  confirmDescription: (title: string) => `‘${title}’ 결과로 처리하고 처리 이력에 기록합니다. 기록은 수정할 수 없습니다.`,
  processed: '신고를 처리했습니다.',
  markedInProgress: '처리 중으로 표시했습니다.',
  closed: '처리가 끝난 신고입니다.',
  pastSanctions: '피신고자 제재 이력',
  noSanctions: '제재 이력이 없습니다.',
};

// ───────── 공고

export const postStatusLabel: Record<PostStatus, string> = { OPEN: '모집 중', CLOSED: '마감', COMPLETED: '종료', DELETED: '삭제됨' };
export const postStatusTone: Record<PostStatus, Tone> = { OPEN: 'indigo', CLOSED: 'amber', COMPLETED: 'slate', DELETED: 'rose' };
export const postStatusOptions = toOptions(postStatusLabel);

export const postText = {
  bulkDelete: '선택 공고 삭제',
  bulkConfirmTitle: '선택한 공고를 삭제할까요?',
  bulkConfirmDescription: (count: number) => `${count}건의 공고가 삭제 처리되며 작성자에게 사유와 함께 알림이 전송됩니다.`,
  deleteTitle: '공고를 삭제할까요?',
  deleteDescription: '삭제하면 작성자에게 사유와 함께 알림이 전달되며, 사용자 화면에서 더 이상 보이지 않습니다.',
  reasonLabel: '삭제 사유',
  reasonPlaceholder: '작성자에게 통지될 삭제 사유를 입력하세요',
  reasonRequired: '삭제 사유를 입력해 주세요.',
  deleted: (count: number) => `${count}건의 공고를 삭제 처리했습니다.`,
  deletedOne: '공고를 삭제했습니다.',
  scheduleTbd: '시간 미정',
};

// ───────── 회원

export const memberStatusLabel: Record<MemberStatus, string> = { ACTIVE: '정상', WARNED: '경고', SUSPENDED: '이용 정지', BANNED: '영구 정지', WITHDRAWN: '탈퇴' };
export const memberStatusTone: Record<MemberStatus, Tone> = { ACTIVE: 'emerald', WARNED: 'amber', SUSPENDED: 'indigo', BANNED: 'rose', WITHDRAWN: 'slate' };
export const memberStatusOptions = toOptions(memberStatusLabel);

export const sanctionTypeLabel: Record<SanctionType, string> = { WARNING: '경고', SUSPEND: '이용 정지', BAN: '영구 정지' };

/** 제재 기간 표시: 정지는 일수, 영구 정지는 "영구", 경고는 "-" */
export const sanctionPeriod = (type: SanctionType, startsAt: string, endsAt: string | null) => {
  if (type === 'BAN') return '영구';
  if (type !== 'SUSPEND' || !endsAt) return adminText.none;
  return `${Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86_400_000)}일`;
};

// ───────── 댓글

export const commentStatusLabel: Record<CommentStatus, string> = { VISIBLE: '정상', REPORTED: '신고됨', HIDDEN: '가림', DELETED: '삭제' };
export const commentStatusTone: Record<CommentStatus, Tone> = { VISIBLE: 'emerald', REPORTED: 'rose', HIDDEN: 'amber', DELETED: 'slate' };
export const commentStatusOptions = toOptions(commentStatusLabel);
export const commentKindOptions: readonly SelectOption[] = [
  { value: 'false', label: '일반 댓글' },
  { value: 'true', label: '비밀 댓글' },
];

export const commentText = {
  hide: '선택 댓글 가림',
  restore: '선택 댓글 복구',
  hiddenText: '관리자에 의해 가려진 댓글입니다.',
  confirmTitle: (label: string) => `선택한 댓글을 ${label} 처리할까요?`,
  confirmDescription: (count: number) => `${count}건의 댓글에 적용됩니다. 처리 사유는 처리 이력에 기록됩니다.`,
  reasonLabel: '처리 사유',
  reasonPlaceholder: '처리 사유를 입력하세요',
  reasonRequired: '처리 사유를 입력해 주세요.',
  done: (label: string, count: number) => `${count}건의 댓글을 ${label} 처리했습니다.`,
  nothing: '처리할 수 있는 댓글이 없습니다. (삭제됐거나 이미 같은 상태)',
};

// ───────── 처리 이력

export const historyKindLabel: Record<HistoryKind, string> = {
  REPORT: '신고 처리',
  POST_DELETE: '공고 삭제',
  COMMENT: '댓글 가림·복구',
  SANCTION: '회원 제재·정지',
  MEMBER_VIEW: '회원 정보 조회',
  LOGIN: '관리자 로그인',
};
export const historyTone: Record<HistoryKind, Tone> = {
  REPORT: 'amber',
  POST_DELETE: 'rose',
  COMMENT: 'indigo',
  SANCTION: 'rose',
  MEMBER_VIEW: 'sky',
  LOGIN: 'slate',
};
export const historyKindOptions = toOptions(historyKindLabel);

const actionTypeLabel: Record<AdminActionType, string> = {
  ADMIN_LOGIN: '로그인',
  REPORT_PROCESS: '신고 처리',
  POST_DELETE: '공고 삭제',
  COMMENT_HIDE: '가림 처리',
  COMMENT_RESTORE: '복구 처리',
  COMMENT_DELETE: '삭제 처리',
  MEMBER_SANCTION: '회원 제재',
  MEMBER_VIEW: '상세 조회',
};

/** 이력 한 줄의 "처리 내용" — 신고 처리·제재는 조치와 기간까지 */
export function describeAction(row: Pick<AdminHistory, 'actionType' | 'detail'>) {
  const detail = row.detail ?? {};
  const withDays = (label: string) => (detail.days ? `${label} (${detail.days}일)` : label);
  if (row.actionType === 'REPORT_PROCESS') {
    if (detail.action) return withDays(reportActionLabel[detail.action]);
    return detail.status === 'IN_PROGRESS' ? '처리 중 표시' : actionTypeLabel.REPORT_PROCESS;
  }
  if (row.actionType === 'MEMBER_SANCTION' && detail.type) return withDays(sanctionTypeLabel[detail.type]);
  return actionTypeLabel[row.actionType];
}

/** 이력 대상으로 가는 바로가기 */
export function historyLink(row: Pick<AdminHistory, 'targetType' | 'targetId'>) {
  if (row.targetId === null) return null;
  const id = String(row.targetId);
  switch (row.targetType) {
    case 'REPORT': return { label: '신고 상세', to: paths.adminReportDetail(id) };
    case 'POST': return { label: '공고 상세', to: paths.adminPostDetail(id) };
    case 'MEMBER': return { label: '회원 상세', to: paths.adminMemberDetail(id) };
    case 'COMMENT': return { label: '댓글 관리', to: ROUTES.adminComments };
    default: return null;
  }
}

// ───────── 대시보드

export const dashboardText = {
  description: '처리가 필요한 신고와 최근 제재 현황을 한눈에 확인합니다.',
  stats: {
    pendingReportCount: '미처리 신고 건수',
    todayReportCount: '오늘 접수된 신고',
    openPostCount: '진행 중인 공고 수',
    recentSanctionCount: '최근 제재 건수',
  },
  recentReports: '최근 신고 목록',
  recentSanctions: '최근 제재 내역',
  noSanctions: '최근 제재 내역이 없습니다.',
  toReports: '신고 관리로 이동 →',
  toHistory: '처리 이력으로 이동 →',
};
export const DASHBOARD_REPORT_COUNT = 4;
