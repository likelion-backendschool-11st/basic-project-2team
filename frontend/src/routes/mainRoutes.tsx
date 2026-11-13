import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import MainPage from '../pages/MainPage';
import MainLoggedInPage from '../pages/MainLoggedInPage';
import SearchResultsPage from '../pages/SearchResultsPage';

/** 메인 · 검색 */
export const mainRoutes: RouteObject[] = [
  { path: ROUTES.home, element: <MainPage /> },
  { path: ROUTES.homeLoggedIn, element: <MainLoggedInPage /> },
  { path: ROUTES.search, element: <SearchResultsPage /> },
];
