import { ROUTES } from './routes';

export const userMenuText = {
  levelPrefix: 'Lv.',
  mannerPrefix: '매너 ',
  logout: '로그아웃',
  profileLink: ROUTES.myPage,
  /** Where the user lands after logging out. */
  logoutRedirect: ROUTES.home,
} as const;
