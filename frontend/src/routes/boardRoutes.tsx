import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import BoardPage from '../pages/BoardPage';
import PostWritePage from '../pages/PostWritePage';
import RequireLogin from '../components/auth/RequireLogin';
import PostDetailPage from '../pages/PostDetailPage';
import ReviewPage from '../pages/ReviewPage';

/** 게시판 · 공고 작성/상세 · 리뷰 */
export const boardRoutes: RouteObject[] = [
  { path: ROUTES.board, element: <BoardPage /> },
  { path: ROUTES.postWrite, element: <RequireLogin><PostWritePage /></RequireLogin> },
  { path: ROUTES.postDetail, element: <PostDetailPage /> },
  { path: ROUTES.review, element: <ReviewPage /> },
];
