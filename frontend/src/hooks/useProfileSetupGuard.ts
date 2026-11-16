import { useLocation } from 'react-router-dom';
import { profileSetupGuard } from '../data/authData';
import { useAuth } from './useAuth';

const isAllowedPath = (pathname: string) =>
  profileSetupGuard.allowedPaths.includes(pathname) ||
  profileSetupGuard.allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * 프로필을 아직 설정하지 않은 회원(user.profileSetupRequired)이 다른 화면으로 가려 하면 이동할 경로를, 아니면 null 을 돌려줍니다.
 * 로그인 화면은 안내 모달을 띄워야 하므로, 관리자 화면은 회원 세션과 무관하므로 그대로 둡니다.
 */
export function useProfileSetupGuard(): string | null {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user?.profileSetupRequired || isAllowedPath(pathname)) return null;
  return profileSetupGuard.redirectTo;
}
