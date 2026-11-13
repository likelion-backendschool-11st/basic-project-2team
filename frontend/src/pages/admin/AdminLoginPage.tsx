import React from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeading from '../../components/auth/AuthHeading';
import AuthPageShell from '../../components/auth/AuthPageShell';
import AuthTextField from '../../components/auth/AuthTextField';
import FormAlert from '../../components/auth/FormAlert';
import { adminLoginText as t } from '../../data/adminData';
import { ROUTES } from '../../data/routes';
import { useAdminLoginForm } from '../../hooks/useAdminLoginForm';

/** 관리자 전용 로그인 (REQ-ADMIN-001: 일반 사용자와 접근 경로 분리) */
export const AdminLoginPage: React.FC = () => {
  const form = useAdminLoginForm();
  return (
    <AuthPageShell maxWidthClassName="max-w-[460px]">
      <AuthHeading icon={t.icon} size="hero" title={t.title} subtitle={t.subtitle} />
      <AuthCard variant="hero">
        <form className="flex flex-col gap-6" noValidate onSubmit={form.onSubmit}>
          <AuthTextField {...t.userId} size="lg" invalid={form.error !== null} value={form.userId} onChange={form.onUserIdChange} />
          <AuthTextField {...t.password} size="lg" type="password" invalid={form.error !== null} value={form.password} onChange={form.onPasswordChange} />
          {form.error && <FormAlert message={form.error} />}
          <button type="submit" disabled={form.submitting} className="w-full h-12 rounded-full bg-mercury hover:bg-mercury-light text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-mercury/30 disabled:opacity-60">
            {form.submitting ? t.submitting : t.submit}<i className={`${t.submitIcon} text-sm`} />
          </button>
        </form>
        <Link to={ROUTES.home} className="block text-center text-sm text-fog-sub hover:text-white mt-6">{t.backHome}</Link>
      </AuthCard>
    </AuthPageShell>
  );
};

export default AdminLoginPage;
