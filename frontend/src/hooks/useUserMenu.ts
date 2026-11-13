import { useNavigate } from 'react-router-dom';
import { userMenuText } from '../data/userData';
import { useAuth } from './useAuth';

/** Logged-in header actions (logout). */
export function useUserMenu() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const onLogout = async () => {
    await logout();
    navigate(userMenuText.logoutRedirect);
  };
  return { onLogout };
}
