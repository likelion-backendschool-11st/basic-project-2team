import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAdminToken, getAdminMe, hasAdminToken, isAdminAuthError, type AdminProfile } from '../api/adminApi';
import { ApiRequestError } from '../api/http';
import { ROUTES } from '../data/routes';

const FALLBACK_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';

/**
 * API 오류 → 화면에 보여줄 메시지. 인증 오류(토큰 없음·만료·비활성 계정)면 토큰을 지우고 관리자 로그인으로 보냅니다.
 */
export function useAdminErrorMessage() {
  const navigate = useNavigate();
  return useCallback(
    (err: unknown) => {
      if (isAdminAuthError(err)) {
        clearAdminToken();
        navigate(ROUTES.adminLogin, { replace: true });
      }
      return err instanceof ApiRequestError ? err.message : FALLBACK_MESSAGE;
    },
    [navigate],
  );
}

/** 관리자 레이아웃용: 로그인한 관리자 정보와 로그아웃. 토큰이 없으면 바로 로그인 화면으로 보냅니다. */
export function useAdminSession() {
  const navigate = useNavigate();
  const toMessage = useAdminErrorMessage();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (!hasAdminToken()) {
      navigate(ROUTES.adminLogin, { replace: true });
      return;
    }
    let ignore = false;
    getAdminMe()
      .then((me) => {
        if (!ignore) setAdmin(me);
      })
      .catch(toMessage);
    return () => {
      ignore = true;
    };
  }, [navigate, toMessage]);

  const logout = () => {
    clearAdminToken();
    navigate(ROUTES.adminLogin);
  };

  return { admin, logout };
}
