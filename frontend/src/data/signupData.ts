import { ROUTES } from './routes';

export type SignupFieldKey =
  | 'name'
  | 'phone'
  | 'address'
  | 'userId'
  | 'nickname'
  | 'password'
  | 'passwordConfirm'
  | 'email';

export type DuplicateCheckKey = 'userId' | 'nickname' | 'email';

/** checking: 서버 확인 중 · taken: 이미 사용 중 · invalid: 형식 오류 (문구는 서버 메시지를 우선) */
export type CheckStatus = 'idle' | 'empty' | 'checking' | 'available' | 'taken' | 'invalid';

export interface SignupFieldConfig {
  readonly key: SignupFieldKey;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly type: 'text' | 'tel' | 'email' | 'password';
  readonly autoComplete?: string;
}

export interface TermItem {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  /** When present, renders a plain note instead of the "보기" button. */
  readonly note?: string;
}

export interface TrustIndicator {
  readonly icon: string;
  readonly label: string;
}

export interface PerkItem {
  readonly id: string;
  readonly icon: string;
  readonly tone: 'primary' | 'secondary';
  readonly eyebrow: string;
  readonly title: string;
  readonly caption: string;
}

export const signupText = {
  eyebrow: 'Member Registration',
  title: '회원가입',
  subtitle: 'OurParty와 함께 최고의 팀원과 플레이를 시작하세요',
  basicSectionTitle: '기본 정보',
  basicSectionHint: '실제 본인 정보를 입력해주세요',
  checkButton: '중복 확인',
  passwordGuide: '영문, 숫자, 특수문자(!, @, #)를 모두 포함한 8~12자로 입력해주세요.',
  passwordMismatch: '비밀번호가 일치하지 않습니다',
  passwordMatch: '비밀번호가 일치합니다',
  emailNote: '인증 불필요 · 계정 복구 용도로만 등록됩니다',
  showPassword: '비밀번호 보기',
  hidePassword: '비밀번호 숨기기',
  termsTitle: '이용약관 동의',
  agreeAll: '전체동의',
  requiredBadge: '필수',
  optionalBadge: '선택',
  viewTerms: '보기',
  submit: '회원가입 완료',
  haveAccount: '이미 계정이 있으신가요?',
  loginLink: '로그인하기',
  loginTo: ROUTES.login,
  errorRequiredTerms: '필수 약관에 모두 동의해주셔야 가입이 진행됩니다.',
  errorPasswordMismatch: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
  errorFailed: '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.',
  checkFailed: '중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
} as const;

export const checkMessages: Readonly<Record<DuplicateCheckKey, Readonly<Record<CheckStatus, string>>>> = {
  userId: {
    idle: '중복 확인을 눌러주세요',
    empty: '내용을 입력하신 후 확인해주세요',
    checking: '확인 중입니다…',
    available: '사용 가능한 아이디입니다',
    taken: '이미 사용 중인 아이디입니다',
    invalid: '아이디는 영문 소문자와 숫자 4~20자로 입력해주세요.',
  },
  nickname: {
    idle: '중복 확인을 눌러주세요',
    empty: '내용을 입력하신 후 확인해주세요',
    checking: '확인 중입니다…',
    available: '사용 가능한 닉네임입니다',
    taken: '이미 사용 중인 닉네임입니다',
    invalid: '닉네임은 공백 없이 2~10자로 입력해주세요.',
  },
  email: {
    idle: '중복 확인을 눌러주세요',
    empty: '내용을 입력하신 후 확인해주세요',
    checking: '확인 중입니다…',
    available: '사용 가능한 이메일입니다',
    taken: '이미 가입된 이메일입니다',
    invalid: '올바른 이메일 형식이 아닙니다.',
  },
};

/** 회원가입 전에 중복 확인을 마치지 않았을 때 */
export const checkRequiredMessages: Readonly<Record<DuplicateCheckKey, string>> = {
  userId: '아이디 중복 확인을 해주세요.',
  nickname: '닉네임 중복 확인을 해주세요.',
  email: '이메일 중복 확인을 해주세요.',
};

/** 409 DUPLICATE_* 응답 code → 다시 확인해야 하는 필드 (휴대폰은 중복 확인 버튼이 없어 메시지만 표시) */
export const duplicateErrorFields: Readonly<Record<string, DuplicateCheckKey>> = {
  DUPLICATE_LOGIN_ID: 'userId',
  DUPLICATE_NICKNAME: 'nickname',
  DUPLICATE_EMAIL: 'email',
};

/** 화면의 약관 항목 id → API agreements 키. 만 14세 확인(age)은 서버에 보내지 않고 화면에서만 필수로 확인합니다. */
export const agreementTermIds = {
  terms: 'service',
  privacy: 'privacy',
  marketing: 'push',
} as const;

export const signupFields: Readonly<Record<SignupFieldKey, SignupFieldConfig>> = {
  name: { key: 'name', id: 'user-name', label: '이름', placeholder: '이름을 입력하세요', type: 'text', autoComplete: 'name' },
  phone: { key: 'phone', id: 'user-phone', label: '휴대폰 번호', placeholder: '010-0000-0000', type: 'tel', autoComplete: 'tel' },
  address: { key: 'address', id: 'user-address', label: '주소 (선택)', placeholder: '거주 지역 또는 주소', type: 'text', autoComplete: 'street-address' },
  userId: { key: 'userId', id: 'user-id', label: '아이디', placeholder: '아이디를 입력하세요', type: 'text', autoComplete: 'username' },
  nickname: { key: 'nickname', id: 'user-nickname', label: '닉네임', placeholder: '닉네임을 입력하세요', type: 'text', autoComplete: 'nickname' },
  password: { key: 'password', id: 'user-password', label: '비밀번호', placeholder: '비밀번호를 입력하세요', type: 'password', autoComplete: 'new-password' },
  passwordConfirm: { key: 'passwordConfirm', id: 'user-password-confirm', label: '비밀번호 확인', placeholder: '비밀번호를 확인합니다.', type: 'password', autoComplete: 'new-password' },
  email: { key: 'email', id: 'user-email', label: '이메일', placeholder: '이메일을 입력하세요', type: 'email', autoComplete: 'email' },
};

export const termItems: readonly TermItem[] = [
  { id: 'service', label: '서비스 이용약관 동의', required: true },
  { id: 'privacy', label: '개인정보 처리방침 동의', required: true },
  { id: 'age', label: '만 14세 이상 확인', required: true, note: '연령 확인' },
  { id: 'push', label: '푸시 알림 수신 동의', required: false },
];

export const signupTrustIndicators: readonly TrustIndicator[] = [
  { icon: 'fa-solid fa-lock', label: 'SSL 256비트 암호화 전송' },
  { icon: 'fa-solid fa-shield', label: '개인정보 안심 보호' },
];

export const signupCompleteText = {
  statusPill: 'Account Verified',
  title: '회원가입 완료!',
  defaultNickname: '게이머',
  welcomeSuffix: '님, 환영합니다!',
  welcomeBody: '이제 우리 서비스를 이용하실 수 있어요.',
  banner: 'OurParty와 함께 새로운 파티를 모집해보세요!',
  loginButton: '로그인하기',
  loginTo: ROUTES.login,
  homeLink: '메인 페이지로 가기',
  homeTo: ROUTES.home,
  securityNote: '보안 암호화 인증을 통해 계정이 안전하게 생성되었습니다.',
} as const;

export const signupPerks: readonly PerkItem[] = [
  {
    id: 'manner',
    icon: 'fa-solid fa-temperature-half',
    tone: 'primary',
    eyebrow: '신뢰도 기본 부여',
    title: '매너온도 36.5℃ 시작',
    caption: '클린 파티 매칭을 위한 기준치',
  },
  {
    id: 'recommend',
    icon: 'fa-solid fa-sliders',
    tone: 'secondary',
    eyebrow: '실시간 추천',
    title: '맞춤 파티 추천 준비 완료',
    caption: '선호 장르 기반 큐레이션',
  },
];
