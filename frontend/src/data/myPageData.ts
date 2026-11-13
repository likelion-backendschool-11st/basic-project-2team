import { ROUTES } from './routes';

export type GameAccent = 'amber' | 'blue' | 'rose';
export type ActivityTab = 'posts' | 'parties' | 'comments';

/**
 * 목록 「상태 / 조치」 칸에 보여줄 것.
 * - `complete`: 「활동 완료 처리」 버튼 (PATCH /api/posts/{postId}/status)
 * - `review`: 「별점 평가」 버튼 (평가할 파티원이 남음)
 * - `label`: 버튼 없이 상태만 표시 (모집 중·마감·평가 완료 …)
 */
export type ActivityActionKind = 'complete' | 'review' | 'label';

export interface ActivityAction {
  readonly kind: ActivityActionKind;
  readonly label: string;
}

export interface AccountMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly variant: 'primary' | 'default' | 'danger';
  readonly to: string;
  /** Render a divider above this item. */
  readonly dividerBefore?: boolean;
  readonly showChevron?: boolean;
}

export interface ProfileStat {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly highlight?: boolean;
}

export interface TopTag {
  readonly rank: 1 | 2 | 3;
  readonly label: string;
  readonly percent: string;
}

export interface ProfileField {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/** 마이페이지 상단 프로필 카드 (GET /api/members/me/summary 를 화면용으로 바꾼 값) */
export interface ProfileSummary {
  readonly avatarUrl: string | null;
  readonly nickname: string;
  readonly levelLabel: string;
  /** 대표 게임 배지. 게이머 프로필이 없으면 null */
  readonly mainGameBadge: string | null;
  readonly fields: readonly ProfileField[];
  readonly intro: string;
  readonly stats: readonly ProfileStat[];
  readonly rating: { readonly score: string; readonly temperature: string };
  readonly topTagsCaption: string;
  readonly topTags: readonly TopTag[];
}

/** 내 공고 · 참여한 파티 한 줄 */
export interface ActivityPost {
  readonly id: string;
  /** 「활동 완료」·「별점 평가」를 호출할 공고 id */
  readonly postId: number;
  readonly no: number;
  readonly game: string;
  readonly accent: GameAccent;
  readonly title: string;
  readonly members: string;
  readonly full: boolean;
  readonly date: string;
  readonly action: ActivityAction;
  readonly to: string;
}

export interface ActivityComment {
  readonly id: string;
  readonly no: number;
  readonly game: string;
  readonly accent: GameAccent;
  readonly postTitle: string;
  readonly content: string;
  readonly date: string;
  readonly to: string;
}

export interface FavoriteUser {
  readonly id: number;
  readonly name: string;
  readonly level: number;
  readonly detail: string;
  readonly avatarUrl: string | null;
  readonly manner: string;
}

export const accountMenu = {
  title: '계정 관리',
  ariaLabel: '사이드 메뉴',
  contentAriaLabel: '마이페이지 상세 컨텐츠',
  items: [
    { id: 'edit-profile', label: '프로필 수정', icon: 'fa-pen', variant: 'primary', to: ROUTES.profileEdit, showChevron: true },
    { id: 'change-password', label: '비밀번호 변경', icon: 'fa-lock', variant: 'default', to: ROUTES.passwordChange },
    { id: 'withdraw', label: '회원 탈퇴', icon: 'fa-trash-can', variant: 'danger', to: ROUTES.withdraw, dividerBefore: true },
  ] as readonly AccountMenuItem[],
};

export const profileText = {
  avatarAltSuffix: ' 프로필 이미지',
  avatarCaption: '프로필 이미지',
  levelPrefix: 'Lv.',
  mainGamePrefix: '대표 게임 ',
  nicknameLabel: '닉네임 :',
  gamesLabel: '선호하는 게임 :',
  styleLabel: '플레이 스타일 :',
  noGames: '등록한 게임이 없습니다',
  noStyle: '미설정',
  noIntro: '아직 자기소개가 없습니다.',
  postsLabel: '게시글 수',
  postsUnit: '개',
  partiesLabel: '완료한 파티 수',
  partiesUnit: '회 완료',
  ratingLabel: '유저 평점 (매너 온도)',
  ratingNote: '(최근 30건 반영)',
  noRating: '-',
  temperatureSuffix: '°C',
  topTagsTitle: '유저들이 뽑은 태그 Top 3',
  reviewCountCaption: (count: number) => `받은 평가 ${count}건`,
  noTopTags: '아직 받은 태그가 없습니다.',
  rankSuffix: '위',
  loading: '프로필을 불러오는 중입니다…',
  loadFailed: '프로필을 불러오지 못했습니다.',
  retry: '다시 시도',
};

/** 게임 코드별 배지 색 (없는 게임은 blue) */
export const gameAccents: Readonly<Record<string, GameAccent>> = {
  lostark: 'amber',
  ff14: 'amber',
  wow: 'amber',
  maplestory: 'amber',
  lol: 'blue',
  tft: 'blue',
  overwatch: 'blue',
  valorant: 'rose',
  apex: 'rose',
  pubg: 'rose',
  dota2: 'rose',
};

export const activityText = {
  tabs: [
    { id: 'posts', label: '내 공고' },
    { id: 'parties', label: '참여한 파티' },
    { id: 'comments', label: '댓글' },
  ] as readonly { readonly id: ActivityTab; readonly label: string; readonly badge?: string }[],
  hint: '활동이 끝난 파티는 활동 완료 처리 후 파티원에게 별점을 남겨주세요.',
  titles: {
    posts: '내가 모집한 공고',
    parties: '내가 참여한 파티',
    comments: '내가 작성한 댓글',
  } as Record<ActivityTab, string>,
  countLabel: {
    posts: (n: number) => `총 ${n}건 등록됨`,
    parties: (n: number) => `총 ${n}건 참여함`,
    comments: (n: number) => `총 ${n}건 작성됨`,
  } as Record<ActivityTab, (n: number) => string>,
  empty: {
    posts: '아직 작성한 공고가 없습니다.',
    parties: '아직 참여한 파티가 없습니다.',
    comments: '아직 작성한 댓글이 없습니다.',
  } as Record<ActivityTab, string>,
  loading: '불러오는 중입니다…',
  loadFailed: '목록을 불러오지 못했습니다.',
  columns: {
    no: '번호',
    game: '게임',
    title: '글 제목 또는 파티 내용',
    date: '작성일',
    status: '상태 / 조치',
    comment: '댓글 내용',
  },
  /** 공고 상태 (버튼이 없을 때 그대로 표시) */
  postStatus: {
    OPEN: '모집 중',
    PAUSED: '모집 중단',
    CLOSED: '모집 마감',
    COMPLETED: '활동 완료',
  } as Record<string, string>,
  complete: '활동 완료 처리',
  review: (reviewed: number, total: number) => `별점 평가 ${reviewed}/${total}`,
  reviewed: '평가 완료',
  hostPrefix: '파티장 ',
  hiddenComment: '[가려진 댓글] ',
  secretComment: '[비밀] ',
  rangeSuffix: '개',
  pageSize: 5,
  prevLabel: '<',
  nextLabel: '>',
};

export const completeText = {
  title: '활동을 완료 처리할까요?',
  description: '완료하면 모집 상태로 되돌릴 수 없고, 파티원 모두에게 활동 점수가 지급됩니다. 이후 파티원끼리 별점 평가를 할 수 있습니다.',
  confirm: '활동 완료',
  confirming: '처리 중…',
  cancel: '취소',
  done: '활동 완료 처리했습니다. 파티원에게 별점을 남겨주세요.',
  failed: '활동 완료 처리에 실패했습니다.',
};

export const favoritesText = {
  title: '즐겨찾기 한 유저 목록',
  countSuffix: '명',
  levelPrefix: 'Lv.',
  mannerPrefix: '매너 ',
  noMainGame: '대표 게임 미설정',
  remove: '즐겨찾기 해제',
  removed: (name: string) => `${name}님을 즐겨찾기에서 해제했습니다.`,
  removeFailed: '즐겨찾기 해제에 실패했습니다.',
  empty: '아직 즐겨찾기한 유저가 없습니다.',
  avatarAltSuffix: ' 아바타',
};
