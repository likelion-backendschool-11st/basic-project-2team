import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginSanctionOf, type LoginSanction } from '../api/authApi';
import { errorMessageOf } from '../api/http';
import { loginText, profileSetupPromptText } from '../data/authData';
import { ROUTES } from '../data/routes';

export function useLoginForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  /** 화면에 보여줄 에러 문구 (잘못된 아이디/비밀번호, 계정 잠금·정지, 네트워크 오류 등) */
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 정지·영구 정지 회원이 로그인하면 안내 모달에 보여줄 제재 내용 (null 이면 모달 닫힘) */
  const [sanction, setSanction] = useState<LoginSanction | null>(null);
  const closeSanction = useCallback(() => setSanction(null), []);
  /** 프로필을 아직 설정하지 않은 회원(신규 가입 등)이면 프로필 설정 안내 모달에 보여줄 닉네임 (null 이면 모달 닫힘) */
  const [profilePromptNickname, setProfilePromptNickname] = useState<string | null>(null);
  /** 안내 모달 "프로필 설정하러 가기" — 프로필 수정 화면으로 이동 (건너뛸 수 없음) */
  const goToProfileSetup = useCallback(() => navigate(profileSetupPromptText.confirmRedirect), [navigate]);

  const onUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError(null);
  };
  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };
  const onRememberMeChange = (e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked);

  /** POST /api/auth/login — 성공하면 토큰·사용자 정보가 저장되고 헤더가 로그인 상태로 바뀝니다. */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const id = username.trim();
    if (!id || !password) {
      setError(loginText.requiredMessage);
      return;
    }
    // Demo: 관리자 로그인 API 는 아직 연결 전이라 id "admin" 은 기존처럼 관리자 대시보드로 보냅니다.
    if (id === 'admin') {
      navigate(ROUTES.admin);
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(id, password, rememberMe);
      if (user.profileSetupRequired) setProfilePromptNickname(user.nickname);
      else navigate(loginText.successRedirect);
    } catch (err) {
      setError(errorMessageOf(err, loginText.failedMessage));
      setSanction(loginSanctionOf(err));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    username,
    password,
    rememberMe,
    error,
    submitting,
    sanction,
    closeSanction,
    profilePromptNickname,
    goToProfileSetup,
    onUsernameChange,
    onPasswordChange,
    onRememberMeChange,
    onSubmit,
  };
}
