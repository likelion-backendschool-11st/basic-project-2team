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
  copyright: '© 2026 OurParty. All rights reserved.',
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
  { label: '커뮤니티 소개', to: ROUTES.about },
  { label: '이용약관', to: ROUTES.terms },
  { label: '개인정보처리방침', to: ROUTES.privacy },
  { label: '고객지원', to: ROUTES.support },
];

export interface LevelUpTip {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly exp: string;
  readonly quip: string;
}

/**
 * 푸터 가운데 「레벨업 공략」. 백엔드 common/activityPoint.js 의 점수표와 맞춥니다
 * (PARTY_COMPLETE +20, POST_CREATE +10 하루 3회, REVIEW_WRITE +5, COMMENT_CREATE +2 하루 10회).
 */
export const levelUpText = {
  title: '레벨업 공략집',
  formula: 'Lv.L → L+1 에는 50 × L EXP · 초반엔 쑥쑥, 갈수록 묵직하게 · 글을 지우면 EXP도 돌려받아요',
};

export const levelUpTips: readonly LevelUpTip[] = [
  { id: 'party', icon: 'fa-flag-checkered', label: '파티 완주', exp: '+20', quip: '탈주 없이 끝까지' },
  { id: 'post', icon: 'fa-bullhorn', label: '공고 작성', exp: '+10', quip: '하루 3번, 도배는 노노' },
  { id: 'review', icon: 'fa-pen-nib', label: '리뷰 작성', exp: '+5', quip: '한 줄 평도 경험치' },
  { id: 'comment', icon: 'fa-comment-dots', label: '댓글', exp: '+2', quip: '하루 10번까지 수다 보상' },
];
