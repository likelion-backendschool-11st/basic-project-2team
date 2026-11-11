import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { boardCategories, boardPosts, DEFAULT_BOARD_CATEGORY, type BoardCategory } from '../data/boardData';
import { ROUTES } from '../data/routes';

/** Reads `?category=` (mmorpg|fps|aos|steam|etc|all), defaulting to MMORPG. */
export function useBoardCategory() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('category') ?? DEFAULT_BOARD_CATEGORY;
  const category: BoardCategory =
    boardCategories.find((c) => c.id === raw) ?? boardCategories.find((c) => c.id === DEFAULT_BOARD_CATEGORY)!;

  const posts = useMemo(
    () => (category.id === 'all' ? boardPosts : boardPosts.filter((p) => p.category === category.id)),
    [category.id],
  );

  return {
    category,
    posts,
    clearCategory: () => navigate(`${ROUTES.board}?category=all`),
  };
}
