import { ApiRequestError, request } from './http';

/** 관리자 토큰은 회원 토큰과 따로 저장합니다 (관리자 계정은 회원과 분리, docs/API_SPEC.md 9절). */
export const ADMIN_ACCESS_TOKEN_KEY = 'adminAccessToken';

const adminRequest = <T>(method: string, path: string, body?: unknown) =>
  request<T>(method, `/api/admin${path}`, body, { tokenKey: ADMIN_ACCESS_TOKEN_KEY });

export const hasAdminToken = () => {
  try {
    return localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) !== null;
  } catch {
    return false;
  }
};

export const clearAdminToken = () => {
  try {
    localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경이면 지울 것도 없음
  }
};

const saveAdminToken = (token: string) => {
  try {
    localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, token);
  } catch {
    // 저장하지 못하면 다음 요청에서 401 → 로그인 화면으로 돌아감
  }
};

/** 토큰이 없거나 만료됐거나, 사용할 수 없는 관리자 계정이면 다시 로그인해야 합니다. */
export const isAdminAuthError = (err: unknown) =>
  err instanceof ApiRequestError && (err.status === 401 || err.code === 'ADMIN_INACTIVE');

// ───────── 공통 타입 (영문 enum, 화면 표시는 data/adminData.ts 에서 한글로 매핑)

export type ReportStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
export type ReportType = 'MEMBER' | 'NO_SHOW' | 'POST' | 'COMMENT';
export type ReportAction = 'WARN' | 'SUSPEND' | 'BAN' | 'DELETE_CONTENT' | 'DISMISS';
export type PostStatus = 'OPEN' | 'PAUSED' | 'CLOSED' | 'COMPLETED' | 'DELETED';
export type MemberStatus = 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED' | 'WITHDRAWN';
export type SanctionType = 'WARNING' | 'SUSPEND' | 'BAN';
export type CommentStatus = 'VISIBLE' | 'REPORTED' | 'HIDDEN' | 'DELETED';
export type CommentUpdateStatus = Exclude<CommentStatus, 'REPORTED'>;
export type HistoryKind = 'REPORT' | 'POST_DELETE' | 'COMMENT' | 'SANCTION' | 'LOGIN';
export type AdminActionType =
  | 'ADMIN_LOGIN'
  | 'REPORT_PROCESS'
  | 'POST_DELETE'
  | 'COMMENT_HIDE'
  | 'COMMENT_RESTORE'
  | 'COMMENT_DELETE'
  | 'MEMBER_SANCTION'
  | 'MEMBER_VIEW';
export type SortOrder = 'desc' | 'asc';

/** 페이지네이션 응답 (docs/API_SPEC.md 1절) */
export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

/** 모든 목록이 받는 쿼리. from · to 는 YYYY-MM-DD (한국 시간 날짜) */
export interface ListQuery {
  readonly page: number;
  readonly size: number;
  readonly sort?: SortOrder;
  readonly from?: string;
  readonly to?: string;
  readonly q?: string;
}

/** 빈 값은 빼고 쿼리 문자열을 만듭니다. */
const toQueryString = (query: object) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
};

interface Named {
  readonly id: number;
  readonly nickname: string | null;
}

// ───────── 인증

export interface AdminProfile {
  readonly id: number;
  readonly userId: string;
  readonly name: string;
  readonly role: string;
}

/** POST /api/admin/auth/login — 성공하면 관리자 토큰을 저장합니다. */
export async function adminLogin(userId: string, password: string) {
  const data = await request<{ readonly accessToken: string; readonly admin: AdminProfile }>('POST', '/api/admin/auth/login', { userId, password });
  saveAdminToken(data.accessToken);
  return data.admin;
}

export const getAdminMe = () => adminRequest<AdminProfile>('GET', '/me');

// ───────── 대시보드

export interface RecentSanction {
  readonly id: number;
  readonly member: Named & { readonly userId: string | null };
  readonly type: SanctionType;
  readonly reason: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly createdAt: string;
}

export interface AdminDashboard {
  readonly pendingReportCount: number;
  readonly todayReportCount: number;
  readonly openPostCount: number;
  readonly recentSanctionCount: number;
  readonly recentSanctionDays: number;
  readonly recentSanctions: readonly RecentSanction[];
}

export const getDashboard = () => adminRequest<AdminDashboard>('GET', '/dashboard');

// ───────── 신고

export interface AdminReport {
  readonly id: number;
  readonly createdAt: string;
  readonly type: ReportType;
  readonly targetId: number;
  readonly reason: string;
  readonly target: Named;
  readonly reporter: Named;
  readonly status: ReportStatus;
}

export interface Sanction {
  readonly id: number;
  readonly type: SanctionType;
  readonly reason: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly reportId: number | null;
  readonly releasedAt: string | null;
  readonly adminName: string;
  readonly createdAt: string;
}

export interface AdminReportDetail extends Omit<AdminReport, 'target' | 'reporter'> {
  readonly detail: string | null;
  readonly action: ReportAction | null;
  readonly memo: string | null;
  readonly handledBy: string | null;
  readonly handledAt: string | null;
  readonly reporter: Named & { readonly userId: string | null };
  readonly target: Named & { readonly userId: string | null; readonly mannerTemp: number; readonly status: MemberStatus };
  readonly post: { readonly id: number; readonly title: string } | null;
  readonly comment: { readonly id: number; readonly content: string | null } | null;
  readonly sanctions: readonly Sanction[];
}

export interface ReportListQuery extends ListQuery {
  readonly status?: ReportStatus | '';
  readonly type?: ReportType | '';
}

export interface ProcessReportRequest {
  readonly status: Exclude<ReportStatus, 'PENDING'>;
  readonly action?: Exclude<ReportAction, 'DISMISS'>;
  readonly days?: number;
  readonly memo?: string;
}

export const listReports = (query: ReportListQuery) => adminRequest<Page<AdminReport>>('GET', `/reports${toQueryString(query)}`);
export const getReport = (id: number) => adminRequest<AdminReportDetail>('GET', `/reports/${id}`);
export const processReport = (id: number, body: ProcessReportRequest) =>
  adminRequest<{ readonly id: number; readonly status: ReportStatus; readonly action: ReportAction | null }>('PATCH', `/reports/${id}`, body);

// ───────── 공고

export interface AdminPost {
  readonly id: number;
  readonly createdAt: string;
  readonly category: string;
  readonly game: string;
  readonly gameCode: string;
  readonly partyType: string;
  readonly content: string | null;
  readonly title: string;
  readonly author: Named;
  readonly current: number;
  readonly max: number;
  readonly status: PostStatus;
  readonly reportCount: number;
}

export interface AdminLog {
  readonly id: number;
  readonly createdAt: string;
  readonly actionType: AdminActionType;
  readonly adminName: string;
  /** 처리마다 다름. targetLabel = 대상 이름, reason = 사유 */
  readonly detail: AdminLogDetail | null;
}

export interface AdminLogDetail {
  readonly targetLabel?: string | null;
  readonly reason?: string | null;
  readonly action?: ReportAction | null;
  readonly status?: string | null;
  readonly type?: SanctionType | null;
  readonly days?: number | null;
}

export interface AdminPostDetail extends Omit<AdminPost, 'author'> {
  readonly author: Named & { readonly userId: string | null; readonly mannerTemp: number; readonly sanctionCount: number };
  readonly body: string;
  readonly partyName: string | null;
  readonly playStyle: string | null;
  readonly requiredSpec: string | null;
  readonly schedule: string | null;
  readonly voiceRequired: boolean;
  readonly views: number;
  readonly commentCount: number;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly deleteReason: string | null;
  readonly deletedBy: string | null;
  readonly logs: readonly AdminLog[];
  readonly reports: readonly {
    readonly id: number;
    readonly createdAt: string;
    readonly reason: string;
    readonly status: ReportStatus;
    readonly reporter: string | null;
  }[];
}

export interface PostListQuery extends ListQuery {
  readonly status?: PostStatus | '';
  readonly game?: string;
  readonly reported?: boolean;
}

export const listPosts = (query: PostListQuery) => adminRequest<Page<AdminPost>>('GET', `/posts${toQueryString(query)}`);
export const getPost = (id: number) => adminRequest<AdminPostDetail>('GET', `/posts/${id}`);
export const deletePost = (id: number, reason: string) => adminRequest<void>('DELETE', `/posts/${id}`, { reason });

// ───────── 회원

export interface AdminMember {
  readonly id: number;
  readonly nickname: string | null;
  readonly userId: string | null;
  readonly joinedAt: string;
  readonly lastLoginAt: string | null;
  readonly mannerTemp: number;
  readonly reportCount: number;
  readonly sanctionCount: number;
  readonly status: MemberStatus;
  readonly suspendedUntil: string | null;
}

export interface AdminMemberDetail extends Omit<AdminMember, 'reportCount' | 'sanctionCount'> {
  readonly email: string | null;
  readonly phone: string | null;
  readonly name: string | null;
  readonly ageRange: string | null;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly reviewCount: number;
  readonly level: number;
  readonly withdrawnAt: string | null;
  readonly stats: { readonly postCount: number; readonly partyCount: number; readonly noShowCount: number; readonly reportCount: number };
  readonly games: readonly {
    readonly game: string;
    readonly isMain: boolean;
    readonly characterName: string | null;
    readonly playTimeSlot: string | null;
    readonly playStyle: string | null;
  }[];
  readonly sanctions: readonly Sanction[];
}

export interface MemberListQuery extends ListQuery {
  readonly status?: MemberStatus | '';
  readonly reported?: boolean;
}

export const listMembers = (query: MemberListQuery) => adminRequest<Page<AdminMember>>('GET', `/members${toQueryString(query)}`);
export const getMember = (id: number) => adminRequest<AdminMemberDetail>('GET', `/members/${id}`);

// ───────── 댓글

export interface AdminComment {
  readonly id: number;
  readonly createdAt: string;
  readonly post: { readonly id: number; readonly title: string };
  readonly parentId: number | null;
  readonly author: Named;
  readonly text: string;
  readonly secret: boolean;
  readonly reportCount: number;
  readonly status: CommentStatus;
}

export interface CommentListQuery extends ListQuery {
  readonly status?: CommentStatus | '';
  readonly secret?: boolean;
}

export const listComments = (query: CommentListQuery) => adminRequest<Page<AdminComment>>('GET', `/comments${toQueryString(query)}`);
export const updateComment = (id: number, status: CommentUpdateStatus, reason: string) =>
  adminRequest<{ readonly id: number; readonly status: CommentUpdateStatus }>('PATCH', `/comments/${id}`, { status, reason });

// ───────── 처리 이력

export interface AdminHistory extends AdminLog {
  readonly kind: HistoryKind | null;
  readonly targetType: 'ADMIN' | 'REPORT' | 'POST' | 'COMMENT' | 'MEMBER' | null;
  readonly targetId: number | null;
}

export interface HistoryListQuery extends ListQuery {
  readonly kind?: HistoryKind | '';
}

export const listHistory = (query: HistoryListQuery) => adminRequest<Page<AdminHistory>>('GET', `/history${toQueryString(query)}`);
