import { ROUTES } from './routes';

export const userMenuText = {
  levelPrefix: 'Lv.',
  mannerPrefix: '매너 ',
  logout: '로그아웃',
  profileLink: ROUTES.myPage,
  /** Where the user lands after logging out. */
  logoutRedirect: ROUTES.home,
} as const;

/** 경험치 게이지에 그릴 값 (API 응답 → 화면용으로 변환한 것) */
export interface ExpGaugeView {
  /** 0~100 */
  readonly percent: number;
  /** "600 / 2,400 EXP" · 최고 레벨이면 "MAX" */
  readonly label: string;
  /** 스크린 리더·툴팁용 "다음 레벨까지 1,800 EXP" */
  readonly description: string;
}

export const expText = {
  title: 'EXP',
  unit: 'EXP',
  max: 'MAX',
  maxDescription: '최고 레벨에 도달했어요',
  /** "600 / 2,400 EXP" */
  progress: (current: number, required: number) => `${current.toLocaleString('ko-KR')} / ${required.toLocaleString('ko-KR')} EXP`,
  /** "다음 레벨까지 1,800 EXP" */
  remaining: (left: number) => `다음 레벨까지 ${left.toLocaleString('ko-KR')} EXP`,
} as const;
