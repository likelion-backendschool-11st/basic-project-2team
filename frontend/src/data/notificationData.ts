/** 알림 페이지 화면 문구와 알림 유형별 표시 (docs/API_SPEC.md 4절 알림함) */

export type NotificationType =
  | 'APPLICATION_RECEIVED'
  | 'APPLICATION_RESULT'
  | 'APPLICATION_CANCELED'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'FAVORITE_AUTHOR_POST'
  | 'INTEREST_POST'
  | 'SANCTION';

export interface NotificationView {
  readonly id: string;
  readonly message: string;
  readonly typeLabel: string;
  readonly icon: string;
  /** 아이콘 배경·글자 색 (Tailwind 클래스) */
  readonly tone: string;
  readonly timeAgo: string;
  readonly read: boolean;
  /** 연결된 공고. 없거나 삭제됐으면 null */
  readonly postId: number | null;
}

export const NOTIFICATION_PAGE_SIZE = 20;

/** 관심 알림 설정 개수 상한 (서버 MAX_SUBSCRIPTIONS 와 같은 값) */
export const MAX_SUBSCRIPTIONS = 20;

export interface SubscriptionView {
  readonly id: number;
  /** 화면에 보일 이름: `로스트아크` 또는 `로스트아크 · 카멘` */
  readonly name: string;
  readonly enabled: boolean;
}

const toneBrand = 'bg-mercury/15 text-mercury-light';
const toneOk = 'bg-emerald-500/15 text-emerald-300';
const toneWarn = 'bg-amber-500/15 text-amber-300';
const toneDanger = 'bg-rose-500/15 text-rose-300';
const toneMuted = 'bg-night-card text-fog-sub';

export const notificationTypes: Readonly<Record<NotificationType, { label: string; icon: string; tone: string }>> = {
  APPLICATION_RECEIVED: { label: '새 신청', icon: 'fa-solid fa-user-plus', tone: toneBrand },
  APPLICATION_RESULT: { label: '신청 결과', icon: 'fa-solid fa-circle-check', tone: toneOk },
  APPLICATION_CANCELED: { label: '신청 취소', icon: 'fa-solid fa-user-minus', tone: toneMuted },
  POST_UPDATED: { label: '공고 변경', icon: 'fa-solid fa-pen-to-square', tone: toneWarn },
  POST_DELETED: { label: '공고 삭제', icon: 'fa-solid fa-trash', tone: toneDanger },
  FAVORITE_AUTHOR_POST: { label: '즐겨찾기 새 공고', icon: 'fa-solid fa-star', tone: toneBrand },
  INTEREST_POST: { label: '관심 게임 새 공고', icon: 'fa-solid fa-gamepad', tone: toneOk },
  SANCTION: { label: '제재 안내', icon: 'fa-solid fa-triangle-exclamation', tone: toneDanger },
};

/** 알려지지 않은 유형(서버에 새 유형이 생겼을 때)의 기본 표시 */
export const unknownNotificationType = { label: '알림', icon: 'fa-regular fa-bell', tone: toneMuted };

export const notificationText = {
  title: '알림',
  unreadCount: (count: number) => `안 읽은 알림 ${count}개`,
  allRead: '모든 알림을 읽었습니다',
  filterAll: '전체',
  filterUnread: '안 읽은 알림',
  filterAriaLabel: '알림 필터',
  listAriaLabel: '알림 목록',
  unreadMark: '안 읽음',
  markAllRead: '모두 읽음',
  markRead: '읽음으로 표시',
  delete: '삭제',
  deleteFailed: '알림을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.',
  markFailed: '알림을 읽음 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  loading: '알림을 불러오는 중입니다...',
  loadFailed: '알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  retry: '다시 시도',
  empty: '받은 알림이 없습니다.',
  emptyUnread: '안 읽은 알림이 없습니다.',
  justNow: '방금 전',
  settings: '알림 설정',
  settingsTitle: '관심 게임 알림',
  settingsDesc: '관심 있는 게임(또는 레이드 등 상세 분류)의 새 공고가 올라오면 알림을 받습니다. 항목별로 켜고 끌 수 있습니다.',
  settingsPanelLabel: '알림 설정 패널',
  settingsGame: '게임',
  settingsDetail: '상세 분류',
  settingsGamePlaceholder: '게임 선택',
  settingsDetailAll: '전체 분류',
  settingsAdd: '추가',
  settingsAdding: '추가 중...',
  settingsEmpty: '설정한 관심 게임이 없습니다. 게임을 골라 추가해보세요.',
  settingsLoading: '불러오는 중입니다...',
  settingsLoadFailed: '알림 설정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  settingsSaveFailed: '알림 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
  settingsRemove: '삭제',
  settingsLimit: (max: number) => `최대 ${max}개까지 설정할 수 있습니다.`,
  settingsSwitchLabel: (name: string) => `${name} 알림`,
  prevPage: '이전 페이지',
  nextPage: '다음 페이지',
} as const;
