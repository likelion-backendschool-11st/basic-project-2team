import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../data/routes';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AdminReportDetailPage from '../pages/admin/AdminReportDetailPage';
import AdminPostsPage from '../pages/admin/AdminPostsPage';
import AdminPostDetailPage from '../pages/admin/AdminPostDetailPage';
import AdminMembersPage from '../pages/admin/AdminMembersPage';
import AdminMemberDetailPage from '../pages/admin/AdminMemberDetailPage';
import AdminCommentsPage from '../pages/admin/AdminCommentsPage';
import AdminHistoryPage from '../pages/admin/AdminHistoryPage';

/** 관리자 */
export const adminRoutes: RouteObject[] = [
  { path: ROUTES.admin, element: <AdminDashboardPage /> },
  { path: ROUTES.adminReports, element: <AdminReportsPage /> },
  { path: ROUTES.adminReportDetail, element: <AdminReportDetailPage /> },
  { path: ROUTES.adminPosts, element: <AdminPostsPage /> },
  { path: ROUTES.adminPostDetail, element: <AdminPostDetailPage /> },
  { path: ROUTES.adminMembers, element: <AdminMembersPage /> },
  { path: ROUTES.adminMemberDetail, element: <AdminMemberDetailPage /> },
  { path: ROUTES.adminComments, element: <AdminCommentsPage /> },
  { path: ROUTES.adminHistory, element: <AdminHistoryPage /> },
];
