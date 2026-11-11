import { useNavigate } from 'react-router-dom';
import { userMenuText } from '../data/userData';

/** Logged-in header actions (logout). */
export function useUserMenu() {
  const navigate = useNavigate();
  const onLogout = () => navigate(userMenuText.logoutRedirect);
  return { onLogout };
}
