import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import InfoPage from '../pages/InfoPage';

/** 푸터 안내 문서 (커뮤니티 소개 · 이용약관 · 개인정보처리방침 · 고객지원) */
export const infoRoutes: RouteObject[] = [
  { path: ROUTES.about, element: <InfoPage docId="about" /> },
  { path: ROUTES.terms, element: <InfoPage docId="terms" /> },
  { path: ROUTES.privacy, element: <InfoPage docId="privacy" /> },
  { path: ROUTES.support, element: <InfoPage docId="support" /> },
];
