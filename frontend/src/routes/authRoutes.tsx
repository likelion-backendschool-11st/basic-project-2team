import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import SignupCompletePage from '../pages/SignupCompletePage';
import FindIdPage from '../pages/FindIdPage';
import FindPasswordPage from '../pages/FindPasswordPage';

/** 로그인 · 회원가입 · 아이디/비밀번호 찾기 */
export const authRoutes: RouteObject[] = [
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.signup, element: <SignupPage /> },
  { path: ROUTES.signupComplete, element: <SignupCompletePage /> },
  { path: ROUTES.findId, element: <FindIdPage /> },
  { path: ROUTES.findPassword, element: <FindPasswordPage /> },
];
