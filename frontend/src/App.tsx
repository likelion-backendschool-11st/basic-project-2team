import { Navigate, useRoutes } from 'react-router-dom';
import ProfileSetupGuard from './components/auth/ProfileSetupGuard';
import { ROUTES } from './data/routes';
import { adminRoutes } from './routes/adminRoutes';
import { authRoutes } from './routes/authRoutes';
import { boardRoutes } from './routes/boardRoutes';
import { infoRoutes } from './routes/infoRoutes';
import { mainRoutes } from './routes/mainRoutes';
import { myPageRoutes } from './routes/myPageRoutes';

/**
 * 라우트는 도메인별 파일(src/routes/)에 정의합니다. 새 페이지는 해당 도메인 파일에만 추가하고,
 * 새 도메인 파일을 만들 때만 아래 목록에 한 줄을 더합니다.
 */
export default function App() {
  const routes = useRoutes([
    ...mainRoutes,
    ...boardRoutes,
    ...authRoutes,
    ...myPageRoutes,
    ...adminRoutes,
    ...infoRoutes,
    { path: '*', element: <Navigate to={ROUTES.home} replace /> },
  ]);
  // 프로필 미설정 회원은 설정을 마칠 때까지 프로필 수정 화면으로 보냅니다.
  return <ProfileSetupGuard>{routes}</ProfileSetupGuard>;
}
