import type { RouteObject } from 'react-router-dom';
import RequireLogin from '../components/auth/RequireLogin';
import { ROUTES } from '../data/routes';
import MyPage from '../pages/MyPage';
import ProfileEditPage from '../pages/ProfileEditPage';
import PasswordChangePage from '../pages/PasswordChangePage';
import WithdrawPage from '../pages/WithdrawPage';
import NotificationsPage from '../pages/NotificationsPage';

/** 마이페이지 · 프로필 · 비밀번호 변경 · 회원 탈퇴 · 알림 */
export const myPageRoutes: RouteObject[] = [
  { path: ROUTES.myPage, element: <RequireLogin message="마이페이지는 로그인 후 이용할 수 있습니다."><MyPage /></RequireLogin> },
  { path: ROUTES.profileEdit, element: <RequireLogin message="프로필 수정은 로그인 후 이용할 수 있습니다."><ProfileEditPage /></RequireLogin> },
  { path: ROUTES.passwordChange, element: <RequireLogin message="비밀번호 변경은 로그인 후 이용할 수 있습니다."><PasswordChangePage /></RequireLogin> },
  { path: ROUTES.withdraw, element: <RequireLogin message="회원 탈퇴는 로그인 후 이용할 수 있습니다."><WithdrawPage /></RequireLogin> },
  { path: ROUTES.notifications, element: <RequireLogin message="알림은 로그인 후 확인할 수 있습니다."><NotificationsPage /></RequireLogin> },
];
