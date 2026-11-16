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
  { path: ROUTES.postWrite, element: <RequireLogin message="공고 작성은 로그인 후 사용할 수 있습니다."><PostWritePage /></RequireLogin> },
  { path: ROUTES.postEdit, element: <RequireLogin message="공고 수정은 로그인 후 사용할 수 있습니다."><PostWritePage /></RequireLogin> },
  { path: ROUTES.postDetail, element: <PostDetailPage /> },
  { path: ROUTES.review, element: <RequireLogin message="매너 평가는 로그인 후 이용할 수 있습니다."><ReviewPage /></RequireLogin> },
];
