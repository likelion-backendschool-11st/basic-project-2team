import { ROUTES } from './routes';

export interface NavItem {
  readonly label: string;
  readonly to: string;
  /** 안 읽은 알림 수 배지를 붙일 메뉴 */
  readonly badge?: boolean;
}

export const brand = {
  name: 'OurParty',
  tagline: 'Gamer Finder',
  copyright: '© 2025 OurParty. All rights reserved.',
};

export const topNavItems: readonly NavItem[] = [
  { label: '홈', to: ROUTES.home },
  { label: '파티매칭 게시판', to: ROUTES.board },
  { label: '알림', to: ROUTES.notifications, badge: true },
  { label: '마이페이지', to: ROUTES.myPage },
];

export const authLinks = {
  login: { label: '로그인', to: ROUTES.login },
  signup: { label: '회원가입', to: ROUTES.signup },
};

export const footerLinks: readonly NavItem[] = [
  { label: '커뮤니티 소개', to: ROUTES.home },
  { label: '이용약관', to: ROUTES.home },
  { label: '개인정보처리방침', to: ROUTES.home },
  { label: '고객지원', to: ROUTES.home },
];
