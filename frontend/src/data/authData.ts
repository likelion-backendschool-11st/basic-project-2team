import { ROUTES } from './routes';

export interface AuthLinkItem {
  readonly label: string;
  readonly to: string;
}

export interface AuthFieldCopy {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly icon?: string;
  readonly hint?: string;
  readonly autoComplete?: string;
}

export interface RecoveryTab {
  readonly id: 'find-id' | 'find-password';
  readonly label: string;
  readonly icon: string;
  readonly to: string;
}

/** Tabs shared by 아이디 찾기 / 비밀번호 찾기 screens. */
export const recoveryTabs: readonly RecoveryTab[] = [
  { id: 'find-id', label: '아이디 찾기', icon: 'fa-solid fa-id-badge', to: ROUTES.findId },
  { id: 'find-password', label: '비밀번호 찾기', icon: 'fa-solid fa-key', to: ROUTES.findPassword },
];

/** 아이디·비밀번호 찾기 이메일 형식 검사 (백엔드 memberConstants.EMAIL_PATTERN 과 동일) */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordToggleLabels = {
  show: '비밀번호 보기 토글',
} as const;

/* ------------------------------------------------------------------ */
/* 로그인                                                              */
/* ------------------------------------------------------------------ */
export const loginText = {
  emblemIcon: 'fa-solid fa-gamepad',
  title: '로그인',
  subtitle: '게이머를 위한 실시간 파티 매칭 서비스',
  fields: {
    username: {
      id: 'username',
      label: '아이디',
      hint: '영문 및 숫자 조합',
      placeholder: '아이디를 입력해주세요',
      icon: 'fa-regular fa-circle-user',
      autoComplete: 'username',
    },
    password: {
      id: 'password',
      label: '비밀번호',
      hint: '8자리 이상',
      placeholder: '비밀번호를 입력해주세요',
      icon: 'fa-solid fa-lock',
      autoComplete: 'current-password',
    },
  } satisfies Record<string, AuthFieldCopy>,
  errorMessage: '아이디 또는 비밀번호가 일치하지 않습니다.',
  rememberMe: '로그인 상태 유지',
  submit: '로그인',
  submitIcon: 'fa-solid fa-arrow-right',
  recoveryLinks: [
    { label: '아이디 찾기', to: ROUTES.findId },
    { label: '비밀번호 찾기', to: ROUTES.findPassword },
  ] satisfies readonly AuthLinkItem[],
  signupPrompt: '아직 계정이 없으신가요?',
  signupLink: { label: '회원가입', to: ROUTES.signup } satisfies AuthLinkItem,
  meta: {
    securityIcon: 'fa-solid fa-shield-halved',
    security: 'SSL 256-bit 보안 암호화 적용',
    onlineCount: '9,420명',
    onlineSuffix: '동시 접속 중',
  },
  minPasswordLength: 8,
  successRedirect: ROUTES.homeLoggedIn,
} as const;

/* ------------------------------------------------------------------ */
/* 아이디 찾기                                                         */
/* ------------------------------------------------------------------ */
export const findIdText = {
  emblemIcon: 'fa-solid fa-gamepad',
  title: '아이디 찾기',
  subtitle: '계정에 등록된 닉네임과 이메일을 통해 아이디를 조회합니다.',
  fields: {
    nickname: {
      id: 'nickname',
      label: '닉네임',
      placeholder: '닉네임을 입력하세요.',
      icon: 'fa-regular fa-circle-user',
    },
    email: {
      id: 'email',
      label: '이메일',
      placeholder: '이메일 주소를 입력하세요.',
      icon: 'fa-regular fa-envelope',
      autoComplete: 'email',
    },
  } satisfies Record<string, AuthFieldCopy>,
  helper: '가입할 때 등록한 닉네임과 이메일을 입력해주세요.',
  submit: '아이디 찾기',
  submitIcon: 'fa-solid fa-magnifying-glass',
  required: '닉네임과 이메일을 모두 입력해주세요.',
  invalidEmail: '올바른 이메일 주소를 입력해주세요.',
  resultPrefix: '회원님의 아이디는',
  resultSuffix: '입니다.',
  mockFoundId: 'gamer_pro77',
  backToLogin: { label: '로그인으로 돌아가기', to: ROUTES.login } satisfies AuthLinkItem,
  altLink: { label: '비밀번호를 잊으셨나요?', to: ROUTES.findPassword } satisfies AuthLinkItem,
  supportPrompt: '가입한 이메일을 분실하셨나요?',
  supportLink: { label: '고객지원 센터 문의', to: ROUTES.home } satisfies AuthLinkItem,
} as const;

/* ------------------------------------------------------------------ */
/* 비밀번호 찾기                                                       */
/* ------------------------------------------------------------------ */
export const findPasswordText = {
  emblemIcon: 'fa-solid fa-lock',
  title: '비밀번호 찾기',
  subtitle: '아이디와 이메일이 일치하면 새로운 비밀번호를 설정하실 수 있습니다.',
  verifyLegend: '계정 본인 확인',
  newPasswordLegend: '새 비밀번호 입력',
  fields: {
    userId: {
      id: 'user-id',
      label: '아이디',
      placeholder: '아이디를 입력하세요.',
      autoComplete: 'username',
    },
    email: {
      id: 'user-email',
      label: '이메일',
      placeholder: '이메일 주소를 입력하세요.',
      autoComplete: 'email',
    },
    newPassword: {
      id: 'new-password',
      label: '새 비밀번호',
      placeholder: '새 비밀번호를 입력해주세요.',
      autoComplete: 'new-password',
    },
    confirmPassword: {
      id: 'confirm-password',
      label: '새 비밀번호 확인',
      placeholder: '새 비밀번호를 한 번 더 입력해주세요.',
      autoComplete: 'new-password',
    },
  } satisfies Record<string, AuthFieldCopy>,
  helper: '가입할 때 등록한 아이디와 이메일을 입력해주세요.',
  submit: '비밀번호 재설정',
  required: '모든 항목을 입력해주세요.',
  invalidEmail: '올바른 이메일 주소를 입력해주세요.',
  mismatch: '새 비밀번호가 일치하지 않습니다.',
  success: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.',
  backToLogin: { label: '로그인으로 돌아가기', to: ROUTES.login } satisfies AuthLinkItem,
  altLink: { label: '아이디를 잊으셨나요?', to: ROUTES.findId } satisfies AuthLinkItem,
} as const;
