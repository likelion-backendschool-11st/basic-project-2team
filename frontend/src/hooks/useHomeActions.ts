import { useNavigate } from 'react-router-dom';
import { paths, ROUTES } from '../data/routes';

/** Navigation for the home feed: open a post, start a new party. */
export function useHomeActions() {
  const navigate = useNavigate();
  return {
    createParty: () => navigate(ROUTES.postWrite),
    openPost: (id: string) => navigate(paths.postDetail(id)),
  };
}
