import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from './data/routes';
import MainPage from './pages/MainPage';
import MainLoggedInPage from './pages/MainLoggedInPage';
import BoardPage from './pages/BoardPage';
import SearchResultsPage from './pages/SearchResultsPage';
import MyPage from './pages/MyPage';
import ReviewPage from './pages/ReviewPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SignupCompletePage from './pages/SignupCompletePage';
import FindIdPage from './pages/FindIdPage';
import FindPasswordPage from './pages/FindPasswordPage';
import ProfileEditPage from './pages/ProfileEditPage';
import PasswordChangePage from './pages/PasswordChangePage';
import WithdrawPage from './pages/WithdrawPage';
import PostWritePage from './pages/PostWritePage';
import PostDetailPage from './pages/PostDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminReportDetailPage from './pages/admin/AdminReportDetailPage';
import AdminPostsPage from './pages/admin/AdminPostsPage';
import AdminPostDetailPage from './pages/admin/AdminPostDetailPage';
import AdminMembersPage from './pages/admin/AdminMembersPage';
import AdminMemberDetailPage from './pages/admin/AdminMemberDetailPage';
import AdminCommentsPage from './pages/admin/AdminCommentsPage';
import AdminHistoryPage from './pages/admin/AdminHistoryPage';

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<MainPage />} />
      <Route path={ROUTES.homeLoggedIn} element={<MainLoggedInPage />} />
      <Route path={ROUTES.board} element={<BoardPage />} />
      <Route path={ROUTES.postWrite} element={<PostWritePage />} />
      <Route path={ROUTES.postDetail} element={<PostDetailPage />} />
      <Route path={ROUTES.search} element={<SearchResultsPage />} />
      <Route path={ROUTES.myPage} element={<MyPage />} />
      <Route path={ROUTES.profileEdit} element={<ProfileEditPage />} />
      <Route path={ROUTES.passwordChange} element={<PasswordChangePage />} />
      <Route path={ROUTES.withdraw} element={<WithdrawPage />} />
      <Route path={ROUTES.review} element={<ReviewPage />} />
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.signup} element={<SignupPage />} />
      <Route path={ROUTES.signupComplete} element={<SignupCompletePage />} />
      <Route path={ROUTES.findId} element={<FindIdPage />} />
      <Route path={ROUTES.findPassword} element={<FindPasswordPage />} />
      <Route path={ROUTES.admin} element={<AdminDashboardPage />} />
      <Route path={ROUTES.adminReports} element={<AdminReportsPage />} />
      <Route path={ROUTES.adminReportDetail} element={<AdminReportDetailPage />} />
      <Route path={ROUTES.adminPosts} element={<AdminPostsPage />} />
      <Route path={ROUTES.adminPostDetail} element={<AdminPostDetailPage />} />
      <Route path={ROUTES.adminMembers} element={<AdminMembersPage />} />
      <Route path={ROUTES.adminMemberDetail} element={<AdminMemberDetailPage />} />
      <Route path={ROUTES.adminComments} element={<AdminCommentsPage />} />
      <Route path={ROUTES.adminHistory} element={<AdminHistoryPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
