import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategories, type CategorySummary } from '../api/boardApi';
import { boardCategories, DEFAULT_BOARD_CATEGORY, type BoardCategory } from '../data/boardData';
import { ROUTES } from '../data/routes';

/** Reads `?category=` (mmorpg|fps|aos|steam|etc|all), defaulting to MMORPG. 카테고리별 공고 수는 서버에서 불러옵니다. */
export function useBoardCategory() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<readonly CategorySummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((list) => !cancelled && setSummaries(list))
      // 공고 수는 부가 정보라 실패해도 목록은 보여주고, 숫자만 숨깁니다.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const total = summaries?.reduce((sum, c) => sum + c.postCount, 0);
  const categories: readonly BoardCategory[] = boardCategories.map((c) => ({
    ...c,
    count: c.id === 'all' ? total : summaries?.find((s) => s.code === c.id)?.postCount,
  }));

  const raw = params.get('category') ?? DEFAULT_BOARD_CATEGORY;
  const category = categories.find((c) => c.id === raw) ?? categories.find((c) => c.id === DEFAULT_BOARD_CATEGORY)!;

  return {
    category,
    categories,
    clearCategory: () => navigate(`${ROUTES.board}?category=all`),
  };
}
