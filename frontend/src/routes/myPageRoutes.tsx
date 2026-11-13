import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import MyPage from '../pages/MyPage';
import ProfileEditPage from '../pages/ProfileEditPage';
import PasswordChangePage from '../pages/PasswordChangePage';
import WithdrawPage from '../pages/WithdrawPage';

/** 마이페이지 · 프로필 · 비밀번호 변경 · 회원 탈퇴 */
export const myPageRoutes: RouteObject[] = [
  { path: ROUTES.myPage, element: <MyPage /> },
  { path: ROUTES.profileEdit, element: <ProfileEditPage /> },
  { path: ROUTES.passwordChange, element: <PasswordChangePage /> },
  { path: ROUTES.withdraw, element: <WithdrawPage /> },
];
