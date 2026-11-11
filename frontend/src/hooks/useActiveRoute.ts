import { useLocation } from 'react-router-dom';

export function useActiveRoute() {
  const { pathname } = useLocation();
  const isActive = (to: string) => {
    if (to === '/') return pathname === '/' || pathname === '/home';
    if (to === '/board') return pathname.startsWith('/board') || pathname.startsWith('/search');
    return pathname.startsWith(to);
  };
  return { pathname, isActive };
}
