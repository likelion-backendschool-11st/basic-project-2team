import type { LoginSanction } from '../api/authApi';
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

/** 영문·숫자·특수문자(!@#)를 모두 포함한 8~12자 (백엔드 memberConstants.PASSWORD_PATTERN 과 동일) */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#])[A-Za-z\d!@#]{8,12}$/;

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
  /** 아이디·비밀번호를 비워 두고 제출했을 때 (그 밖의 실패는 서버 메시지를 그대로 보여줍니다) */
  requiredMessage: '아이디와 비밀번호를 입력해주세요.',
  failedMessage: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
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
  successRedirect: ROUTES.homeLoggedIn,
} as const;

/* ------------------------------------------------------------------ */
/* 로그인 — 정지 회원 안내 모달                                         */
/* ------------------------------------------------------------------ */

/** 안내 문장 조각. highlight 인 조각은 강조해서 그립니다. */
export interface NoticeSegment {
  readonly text: string;
  readonly highlight?: boolean;
}

export interface SanctionNoticeRow {
  readonly label: string;
  readonly value: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO 시각 → 브라우저 시간대 기준 "2026-11-16" */
const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** ISO 시각 → 브라우저 시간대 기준 "2026-11-16 14:30" */
const formatDateTime = (d: Date) => `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "3일 정지" · "영구 정지". 정지 일수를 모르면 "이용 정지" */
const sanctionPeriodLabel = (sanction: LoginSanction) => {
  if (sanction.type === 'BAN') return '영구 정지';
  return sanction.days ? `${sanction.days}일 정지` : '이용 정지';
};

export const sanctionNoticeText = {
  ariaLabel: '이용 제한 안내',
  title: { SUSPEND: '이용이 정지된 계정입니다', BAN: '영구 정지된 계정입니다' } satisfies Record<LoginSanction['type'], string>,
  icon: { SUSPEND: 'fa-user-clock', BAN: 'fa-user-slash' } satisfies Record<LoginSanction['type'], string>,
  /** 사유가 기록되지 않은 제재일 때 */
  fallbackReason: '운영 정책 위반',
  rowLabels: { period: '처분 내용', endsAt: '해제 예정' },
  contact: '처분에 이의가 있으시면 고객센터로 문의해주세요.',
  confirm: '확인',
  /** "(닉네임)님은 (사유)의 이유로 3일 정지 처분을 받아 2026-11-16까지 이용이 불가합니다." */
  message(sanction: LoginSanction): readonly NoticeSegment[] {
    const endsAt = sanction.endsAt ? new Date(sanction.endsAt) : null;
    return [
      { text: sanction.nickname, highlight: true },
      { text: '님은 ' },
      { text: sanction.reason ?? this.fallbackReason, highlight: true },
      { text: '의 이유로 ' },
      { text: sanctionPeriodLabel(sanction), highlight: true },
      { text: ' 처분을 받아 ' },
      ...(endsAt ? [{ text: formatDate(endsAt), highlight: true }, { text: '까지 ' }] : []),
      { text: sanction.type === 'BAN' ? '서비스 이용이 불가합니다.' : '이용이 불가합니다.' },
    ];
  },
  /** 모달 하단 요약 표 */
  rows(sanction: LoginSanction): readonly SanctionNoticeRow[] {
    return [
      { label: this.rowLabels.period, value: sanctionPeriodLabel(sanction) },
      ...(sanction.endsAt ? [{ label: this.rowLabels.endsAt, value: formatDateTime(new Date(sanction.endsAt)) }] : []),
    ];
  },
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
  failed: '아이디를 찾지 못했습니다. 잠시 후 다시 시도해주세요.',
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
  invalidPassword: '비밀번호는 영문, 숫자, 특수문자(!, @, #)를 모두 포함한 8~12자로 입력해주세요.',
  failed: '비밀번호를 재설정하지 못했습니다. 잠시 후 다시 시도해주세요.',
  success: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.',
  backToLogin: { label: '로그인으로 돌아가기', to: ROUTES.login } satisfies AuthLinkItem,
  altLink: { label: '아이디를 잊으셨나요?', to: ROUTES.findId } satisfies AuthLinkItem,
} as const;
