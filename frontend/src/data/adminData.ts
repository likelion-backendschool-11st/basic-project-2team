import { paths, ROUTES } from './routes';

/** Stitch screens: 관리자 (대시보드, 신고/공고/회원/댓글 관리, 처리 이력 + 상세). Mock rows are generated deterministically. */

export type Tone = 'amber' | 'indigo' | 'emerald' | 'slate' | 'rose' | 'sky';

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
  admin: '관리자 마스터',
  role: 'super_admin',
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
  detail: '상세 보기',
};

// ───────── shared bits
const pick = <T,>(list: readonly T[], i: number) => list[i % list.length];
const pad = (n: number) => String(n).padStart(2, '0');
/** 2026-03-31 16:42 style stamp, walking backwards from a base day. */
const stamp = (i: number, step = 47) => {
  const t = 16 * 60 + 42 - i * step;
  const m = ((t % 1440) + 1440) % 1440;
  return `2026.03.${pad(Math.max(1, 31 + Math.floor(t / 1440)))} ${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** `at` is "2026.03.31 16:42"; from/to are <input type=date> values (or empty). */
export const inRange = (at: string, from: string, to: string) => {
  const day = at.slice(0, 10).replace(/\./g, '-');
  return (!from || day >= from) && (!to || day <= to);
};

// ───────── reports
export type ReportStatus = '접수' | '처리 중' | '완료' | '기각';
export interface Report { readonly id: number; readonly at: string; readonly type: '유저' | '노쇼' | '공고' | '댓글'; readonly reason: string; readonly target: string; readonly reporter: string; readonly status: ReportStatus }
export const reportStatusTone: Record<ReportStatus, Tone> = { 접수: 'amber', '처리 중': 'indigo', 완료: 'emerald', 기각: 'slate' };
const reportSeeds: readonly [Report['type'], string, string, string, ReportStatus][] = [
  ['유저', '비매너 채팅 및 모욕적인 언어폭력 반복', 'party_ruiner', 'clean_user', '접수'],
  ['노쇼', '파티 시작 10분 전 통보 없이 당일 무단 불참', 'no_show_kim', 'host_sarah', '처리 중'],
  ['공고', '상업적 외부 사이트 홍보 및 도배 링크', 'ad_bot01', 'daily_runner', '완료'],
  ['댓글', '단순 개인 의견 대립에 따른 허위 신고', 'polite_member', 'user_kyle99', '기각'],
  ['유저', '프로필 사진 타인 도용 의심 및 사기 시도', 'toxic_user', 'admin_help', '접수'],
  ['댓글', '불법 도박 사이트 링크 게시', 'bot_gambling', 'community_guard', '완료'],
];
export const reports: readonly Report[] = Array.from({ length: 24 }, (_, i) => {
  const [type, reason, target, reporter, status] = pick(reportSeeds, i);
  return { id: 128 - i, at: stamp(i, 83), type, reason, target, reporter, status };
});
export const reportPath = (r: Report) => paths.adminReportDetail(String(r.id));
export const reportTypes = ['유저', '노쇼', '공고', '댓글'] as const;
export const reportStatuses: readonly ReportStatus[] = ['접수', '처리 중', '완료', '기각'];

export const decisions = [
  { id: 'dismiss', title: '기각', desc: '허위 신고 또는 위반 사항이 확인되지 않음' },
  { id: 'warn', title: '경고 조치', desc: '경미한 1차 단순 위반 및 주의 통지' },
  { id: 'suspend', title: '이용 정지', desc: '기간을 지정하여 파티 생성 및 참여 일시적 차단', recommended: true },
  { id: 'ban', title: '영구 정지', desc: '계정 영구 접속 박탈 (책임 관리자 전용)' },
  { id: 'delete', title: '공고 또는 댓글 단건 삭제', desc: '해당 게시물을 비공개 처리 및 파티 폐쇄' },
] as const;
export const suspendPeriods = ['1일 정지', '3일 정지', '7일 정지 (운영원칙 2차 위반 기준 권장)', '30일 정지'] as const;

// ───────── posts
export type PostStatus = '모집 중' | '마감' | '종료' | '삭제됨';
export interface AdminPost { readonly id: number; readonly at: string; readonly game: string; readonly type: string; readonly title: string; readonly author: string; readonly cur: number; readonly max: number; readonly status: PostStatus; readonly reports: number }
export const postStatusTone: Record<PostStatus, Tone> = { '모집 중': 'indigo', 마감: 'amber', 종료: 'slate', 삭제됨: 'rose' };
const postSeeds: readonly [string, string, string, string, string, number, number, PostStatus, number][] = [
  ['리그 오브 레전드', '랭크 게임', '[다이아1+] 바텀 듀오 구합니다 마이크 필수', '별빛소환사', '', 1, 2, '모집 중', 0],
  ['발로란트', '일반/경쟁', '불멸 찍으실 엔트리 모십니다', '새도우헌터', '', 5, 5, '마감', 0],
  ['로스트아크', '군단장 레이드', '카멘 하드 1-3관 숙련 팟 클겜자만', '성기사루이', '', 8, 8, '종료', 0],
  ['오버워치 2', '빠른 대전', '[대리/계정거래 의심 홍보글]', '골드러시', '', 1, 5, '삭제됨', 7],
  ['배틀그라운드', '스쿼드', '치킨 뜯으실 3분 구해요 브리핑 필수', '배그마스터', '', 3, 4, '모집 중', 1],
];
export const adminPosts: readonly AdminPost[] = Array.from({ length: 21 }, (_, i) => {
  const [game, type, title, author, , cur, max, status, rep] = pick(postSeeds, i);
  return { id: 10482 - i, at: stamp(i, 95), game, type, title, author, cur, max, status, reports: rep };
});
export const postPath = (p: AdminPost) => paths.adminPostDetail(String(p.id));
export const postGames = [...new Set(postSeeds.map((s) => s[0]))];
export const postStatuses: readonly PostStatus[] = ['모집 중', '마감', '종료', '삭제됨'];

// ───────── members
export type MemberStatus = '정상' | '경고' | '이용 정지' | '영구 정지' | '탈퇴';
export interface Member { readonly id: number; readonly nick: string; readonly uid: string; readonly joined: string; readonly last: string; readonly manner: number; readonly reports: number; readonly sanctions: number; readonly status: MemberStatus }
export const memberStatusTone: Record<MemberStatus, Tone> = { 정상: 'emerald', 경고: 'amber', '이용 정지': 'indigo', '영구 정지': 'rose', 탈퇴: 'slate' };
const memberSeeds: readonly [string, string, number, number, number, MemberStatus][] = [
  ['별빛소환사', 'starlight_99', 98, 0, 0, '정상'], ['티어마스터', 'tiermaster', 72, 2, 1, '경고'], ['그랩의신', 'blitz_god', 45, 5, 2, '이용 정지'],
  ['정글차이', 'jg_gap00', 18, 14, 3, '영구 정지'], ['바드장인', 'bard_love', 85, 1, 0, '탈퇴'],
];
export const members: readonly Member[] = Array.from({ length: 18 }, (_, i) => {
  const [nick, uid, manner, reps, sanc, status] = pick(memberSeeds, i);
  const n = i < 5 ? '' : String(i);
  return { id: 1042 - i, nick: nick + n, uid: uid + n, joined: `2025.${pad(11 - (i % 10))}.${pad(14 - (i % 12))} 15:30`, last: stamp(i, 210), manner, reports: reps, sanctions: sanc, status };
});
export const memberPath = (m: Member) => paths.adminMemberDetail(String(m.id));
export const memberStatuses: readonly MemberStatus[] = ['정상', '경고', '이용 정지', '영구 정지', '탈퇴'];
export const memberProfile = {
  phone: '010-9876-5432', games: '리그 오브 레전드, 발로란트', position: '미드 / 원딜', styles: ['즐겜러', '보이스 필수', '멘탈 좋음'], time: '평일 20:00 ~ 24:00, 주말 상시', age: '20대 중반',
  stats: [['매너 점수', '98점'], ['모집한 공고', '14건'], ['참여한 파티', '42건'], ['노쇼 횟수', '0회']] as const,
  history: [
    { at: '2026.02.10 14:20', action: '경고', period: '-', reason: '비매너 채팅 및 파티 탈주', report: '128' },
    { at: '2025.12.04 09:30', action: '이용 정지', period: '3일', reason: '노쇼 반복 및 허위 공고 작성', report: '121' },
  ],
};

// ───────── comments
export type CommentStatus = '정상' | '신고됨' | '가림' | '삭제';
export interface AdminComment { readonly id: number; readonly at: string; readonly post: string; readonly author: string; readonly text: string; readonly status: CommentStatus; readonly secret?: boolean }
export const commentStatusTone: Record<CommentStatus, Tone> = { 정상: 'emerald', 신고됨: 'rose', 가림: 'amber', 삭제: 'slate' };
const commentSeeds: readonly [string, string, string, CommentStatus, boolean?][] = [
  ['[칼바람 나락 5인팟 구함]', '소환사A', '혹시 디코 방 링크 다시 주실 수 있나요?', '정상'],
  ['[발로란트 초보자 랭크전]', '그림자사냥꾼', '비밀 댓글입니다. 작성자와 방장만 볼 수 있습니다.', '정상', true],
  ['[로스트아크 일리아칸 하드]', '바드장인', '서폿 자리 남았나요? 템렙 1620입니다.', '신고됨'],
  ['[롤 듀오 구합니다 골드]', '티모대위', '작성자가 삭제한 댓글입니다.', '삭제'],
  ['[배그 스쿼드 빡겜팟]', '치킨원정대', '매너 플레이 약속합니다. 친추 보냈어요!', '가림'],
];
export const adminComments: readonly AdminComment[] = Array.from({ length: 22 }, (_, i) => {
  const [post, author, text, status, secret] = pick(commentSeeds, i);
  return { id: 324 - i, at: stamp(i, 38), post, author, text, status, secret };
});
export const commentStatuses: readonly CommentStatus[] = ['정상', '신고됨', '가림', '삭제'];

// ───────── history
export const historyKinds = ['신고 처리', '공고 삭제', '댓글 가림·복구', '회원 제재·정지', '회원 정보 조회'] as const;
export type HistoryKind = (typeof historyKinds)[number];
export const historyTone: Record<HistoryKind, Tone> = { '신고 처리': 'amber', '공고 삭제': 'rose', '댓글 가림·복구': 'indigo', '회원 제재·정지': 'rose', '회원 정보 조회': 'sky' };
export interface HistoryRow { readonly id: number; readonly at: string; readonly kind: HistoryKind; readonly action: string; readonly target: string; readonly reason: string; readonly linkLabel: string; readonly to: string }
const historySeeds: readonly [HistoryKind, string, string, string, string, string][] = [
  ['신고 처리', '경고 조치', '소환사A', '비매너 언행 및 고의 트롤링', '신고 상세', paths.adminReportDetail('128')],
  ['공고 삭제', '공고 삭제', '발로란트 초보자 랭크전', '대리 게임 및 금전 요구 의심', '공고 상세', paths.adminPostDetail('10482')],
  ['댓글 가림·복구', '가림 처리', '댓글 #48291', '욕설 및 비하 발언 포함', '댓글 관리', ROUTES.adminComments],
  ['회원 제재·정지', '이용 정지 (7일)', '트롤마스터', '반복적 신고 누적 및 노쇼', '회원 상세', paths.adminMemberDetail('1042')],
  ['회원 정보 조회', '상세 조회', '별빛소환사', '-', '회원 상세', paths.adminMemberDetail('1042')],
  ['신고 처리', '기각', '힐러장인', '증빙 불충분 및 정상 플레이 확인', '신고 상세', paths.adminReportDetail('125')],
  ['회원 제재·정지', '영구 정지', '헬퍼사용자', '불법 외부 프로그램 사용 확인', '회원 상세', paths.adminMemberDetail('1039')],
];
export const history: readonly HistoryRow[] = Array.from({ length: 21 }, (_, i) => {
  const [kind, action, target, reason, linkLabel, to] = pick(historySeeds, i);
  return { id: 1842 - i, at: stamp(i, 61), kind, action, target, reason, linkLabel, to };
});

// ───────── dashboard
export const dashboardStats = [
  { label: '미처리 신고 건수', value: 14 }, { label: '오늘 접수된 신고', value: 28 }, { label: '진행 중인 공고 수', value: 156 }, { label: '최근 제재 건수', value: 42 },
] as const;
export const recentSanctions = [
  { who: 'shadow_hunter', badge: '계정 7일 정지', tone: 'rose' as Tone, reason: '커뮤니티 가이드라인 위반 (욕설)', time: '09:15' },
  { who: 'ad_spammer_01', badge: '영구 정지', tone: 'rose' as Tone, reason: '상업적 불법 홍보 및 매크로 사용', time: '08:50' },
  { who: 'daily_runner', badge: '경고 1회', tone: 'amber' as Tone, reason: '게시판 주제 부적합 다중 등록', time: '08:12' },
];

// ───────── post detail (admin view)
export const adminPostBody = {
  spec: '다이아몬드 1 이상, 디스코드 마이크 음성 브리핑 필수, 멘탈 좋으신 서포터님 모십니다.',
  body: '오늘 저녁 8시부터 다이아1 승급전 듀오 구합니다. 주 포지션 원딜(카이사, 바루스, 이즈리얼)이며 라인전 공격적이면서 시야 잘 잡아주시는 그랩류 or 유틸 서폿 환영합니다. 비매너/탈주/남탓 사절합니다.',
  uid: 'usr_89214', manner: 98,
  start: '2026.03.31 20:00 (오늘 저녁)',
  logs: [
    { who: 'admin_sarah · 공고 수정 승인', reason: '카테고리 정상화', date: '2026.03.31', time: '16:30' },
    { who: 'system_bot · 자동 스팸 필터링 통과', reason: '금칙어 검사 통과', date: '2026.03.31', time: '16:21' },
  ],
};
export const reportDetailText = {
  description: '파티 보이스 채팅 및 텍스트 채팅에서 지속적인 패드립 및 비하 발언을 도배하여 원활한 파티 진행을 고의적으로 방해했습니다. 파티 룰을 안내했음에도 불구하고 비하 수위를 더욱 높여 게임 종료 직전 전원 강퇴 사태가 발생하였습니다.',
  evidence: ['party_ruiner: 아 진짜 게임 더럽게 못하네 ㅋㅋㅋ 왜 신청했냐', 'party_ruiner: 야 니들 다 나가라 그냥 내가 혼자 함 ㅅㄱ', 'clean_user: 매너 지켜주세요 파티 룰 확인하셨잖아요', 'party_ruiner: 룰 좋아하네 니 부모한테나 따져라 ㅋㅋㅋ (패드립 확인)'],
  log: ['파티 식별자: #PTY-99401', '참여 게임: 리그 오브 레전드 (5인 자유랭크)', '클라이언트 접속 IP: 211.240.78.*** (대한민국 서울)', '음성 통화 세션 유지: 14분 22초 (자진 이탈)'],
  past: [
    { who: 'admin_sarah · 경고 1회 조치', reason: '파티 매칭 성사 후 5분 이내 무단 탈주 및 대기방 폭파', date: '2026-03-02 11:20:41' },
    { who: 'system_auto · 주의 알림 발송', reason: '30일 이내 누적 비매너 신고 3건 도달 자동 트리거 경고', date: '2026-02-14 18:05:12' },
  ],
};
