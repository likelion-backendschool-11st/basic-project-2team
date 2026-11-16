import { ROUTES } from './routes';

/** Stitch screens: "마이페이지 - 프로필 수정 / 비밀번호 변경 / 회원 탈퇴하기" (project 15649597777945524469) */

export interface AccountNavItem {
  readonly id: 'profile' | 'password' | 'withdraw';
  readonly label: string;
  readonly icon: string;
  readonly to: string;
  readonly danger?: boolean;
}

export const accountNav: readonly AccountNavItem[] = [
  { id: 'profile', label: '프로필 수정', icon: 'fa-user-pen', to: ROUTES.profileEdit },
  { id: 'password', label: '비밀번호 변경', icon: 'fa-key', to: ROUTES.passwordChange },
  { id: 'withdraw', label: '탈퇴하기', icon: 'fa-user-xmark', to: ROUTES.withdraw, danger: true },
];

export const accountNotes = {
  profile: { icon: 'fa-shield-halved', tone: 'brand', title: '', body: '닉네임은 변경 후 30일 동안 재변경이 제한될 수 있습니다. 팀원들에게 신뢰감을 주는 닉네임을 권장합니다.' },
  password: { icon: 'fa-shield-halved', tone: 'brand', title: '계정 보안 수칙', body: '비밀번호는 영문 대소문자, 숫자, 특수기호를 혼합해 3개월 주기로 변경하면 탈취 위험을 사전에 방지할 수 있습니다.' },
  withdraw: { icon: 'fa-triangle-exclamation', tone: 'danger', title: '주의사항 안내', body: '탈퇴 처리 시 진행 중인 공격대 파티 매칭 및 보유 명예 배지 데이터는 영구 소멸되며 복구할 수 없습니다.' },
} as const;

export const accountPanelText = {
  closeLabel: '닫기',
  cancel: '취소',
  profile: { title: '프로필 수정', description: '파티 매칭 및 프로필 카드에 표시될 기본 게이밍 정보를 수정합니다.' },
  password: { title: '비밀번호 변경', description: '회원님의 소중한 개인정보와 계정 보안을 위해 비밀번호를 정기적으로 관리해 주세요.' },
  withdraw: { title: '회원 탈퇴', description: '탈퇴 전 유의사항과 영구 삭제되는 정보를 반드시 확인해 주세요.' },
} as const;

/* ───────── profile edit ───────── */

export interface GameOption {
  readonly id: string;
  readonly name: string;
  readonly genre: string;
}

export interface PlayStyleOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const profileText = {
  nicknameLabel: '닉네임',
  /** 백엔드 memberValidator.fieldRules.nickname 과 같은 규칙 (공백 없이 2~10자) */
  nicknameHint: '공백 없이 2~10자로 입력해 주세요',
  nicknameOk: '사용 가능한 닉네임입니다.',
  nicknameInvalid: '닉네임은 공백 없이 2~10자로 입력해주세요.',
  nicknameTaken: '이미 사용 중인 닉네임입니다.',
  nicknameUnchecked: '닉네임을 바꿨다면 [중복 확인]을 눌러주세요.',
  checkButton: '중복 확인',
  checking: '확인 중...',
  checkFailed: '닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
  gamesLabel: '선호하는 게임',
  gamesSub: '(복수 선택 가능)',
  gamesSelected: (n: number) => `${n}개 선택됨`,
  gamesEmpty: '선택할 수 있는 게임을 불러오지 못했습니다.',
  styleLabel: '플레이 스타일',
  save: '저장하기',
  saving: '저장 중...',
  loading: '프로필을 불러오는 중입니다...',
  loadFailed: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
  saveFailed: '프로필을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
  maxNickname: 10,
  minNickname: 2,
  bioLabel: '자기소개',
  bioPlaceholder: '파티원들에게 나를 소개해 주세요 (예: 주말 저녁 위주로 플레이해요!)',
  /** 백엔드 BIO_MAX_LENGTH */
  maxBio: 200,
  ageRangeLabel: '나이대',
  ageRangeNone: '선택 안 함',
  ageRangePublic: '다른 회원에게 나이대 공개',
  ageRangePublicHint: '공개하지 않으면 내 프로필에서만 보여요.',
};

/** 나이대 선택지 (member.age_range VARCHAR(10) — 서버는 10자 이하 문자열이면 받습니다) */
export const ageRanges: readonly string[] = ['10대', '20대', '30대', '40대', '50대 이상'];

/** 플레이 스타일 — 백엔드 PROFILE_PLAY_STYLES(공고와 같은 값: hard · casual · newbie · any) */
export const playStyles: readonly PlayStyleOption[] = [
  { id: 'casual', label: '즐겜 유저예요', description: '친목과 재미를 최우선으로 생각하며 파티원들과 소통을 즐기는 스타일입니다.' },
  { id: 'hard', label: '빡겜 지향이에요', description: '공략과 효율을 중시하며 클리어와 랭크 상승을 목표로 하는 스타일입니다.' },
  { id: 'newbie', label: '초보/트라이 배려해요', description: '처음 해보는 콘텐츠도 천천히 함께 배우며 즐기는 스타일입니다.' },
  { id: 'any', label: '상관 없어요', description: '어떤 분위기의 파티든 상황에 맞춰 함께하는 스타일입니다.' },
];

/** 플레이 스타일이 저장되지 않은 회원의 기본 선택 */
export const DEFAULT_PLAY_STYLE = 'any';

/* ───────── password change ───────── */

export interface PasswordFieldConfig {
  readonly id: 'current' | 'next' | 'confirm';
  readonly label: string;
  readonly side: string;
  readonly placeholder: string;
  readonly autoComplete: string;
}

export const passwordFields: readonly PasswordFieldConfig[] = [
  { id: 'current', label: '현재 비밀번호', side: '본인 확인 필수', placeholder: '현재 사용 중인 비밀번호 입력', autoComplete: 'current-password' },
  { id: 'next', label: '새 비밀번호', side: '영문, 숫자, 특수문자 조합', placeholder: '영문, 숫자, 특수문자(!, @, #) 조합 8~12자', autoComplete: 'new-password' },
  { id: 'confirm', label: '새 비밀번호 확인', side: '비밀번호 재확인', placeholder: '새 비밀번호를 다시 입력해 주세요', autoComplete: 'new-password' },
];

export const passwordText = {
  /** 현재 비밀번호는 따로 확인하는 API 가 없어 [비밀번호 변경] 요청에서 함께 확인합니다. */
  currentHint: '현재 비밀번호는 [비밀번호 변경]을 누르면 함께 확인합니다.',
  failed: '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.',
  submitting: '변경 중...',
  requirementsTitle: '보안 요구 조건 실시간 충족 상태',
  requirementPattern: '8~12자 / 영문+숫자+특수문자(!, @, #) 필수',
  requirementMatch: '비밀번호 일치 확인',
  strengthLabel: '보안도:',
  strength: ['미입력', '취약', '보통', '안전'] as readonly string[],
  forgot: '현재 비밀번호를 잊으셨나요?',
  forgotNote: '로그아웃 후 비밀번호 찾기에서 재설정 가능',
  submit: '비밀번호 변경',
  done: '비밀번호가 변경되었습니다. 보안을 위해 새 비밀번호로 다시 로그인해 주세요.',
  goLogin: '다시 로그인하기',
  showLabel: '비밀번호 보기',
  hideLabel: '비밀번호 숨기기',
};

/* ───────── withdraw ───────── */

export const withdrawText = {
  heading: '정말 탈퇴하시겠어요?',
  description: '탈퇴하시면 현재까지 쌓아온 소중한 기록과 활동 데이터가 모두 파기되며, OurParty 서비스 재이용이 일정 기간 제한됩니다.',
  infoTitle: '탈퇴 시 즉시 삭제되는 정보',
  submit: '회원 탈퇴',
  submitting: '처리 중...',
  keep: '다시 생각해볼게요',
  passwordLabel: '비밀번호 확인',
  passwordPlaceholder: '본인 확인을 위해 현재 비밀번호를 입력해 주세요',
  reasonLabel: '탈퇴 사유 (선택)',
  reasonPlaceholder: '서비스 개선에 참고할게요 (200자 이하)',
  reasonMax: 200,
  failed: '회원 탈퇴를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
};

export const withdrawRows = [
  { id: 'personal', icon: 'fa-regular fa-circle', label: '개인정보', body: '닉네임, 등록 이메일 계정, 프로필 아바타 이미지, 파티 매칭 활동 히스토리' },
  { id: 'activity', icon: 'fa-regular fa-id-card', label: '활동 및 인증', body: '연동된 게임 캐릭터(API 인증 토큰), 원정대 레이드 클리어 지표 및 친구 즐겨찾기 목록 일체 즉시 말소' },
] as const;

export const withdrawAgreements = [
  { id: 'irreversible', title: '위 안내사항을 모두 확인했으며, 탈퇴 후 데이터 복구가 불가능함을 이해했습니다.', note: '(삭제된 계정 정보 및 파티 매칭 기록은 어떠한 경우에도 복원되지 않습니다.)' },
  { id: 'leftover', title: "남아있는 게시글, 댓글은 '탈퇴한 사용자'로 표시됩니다.", note: '(작성하신 커뮤니티 파티 구인글 및 공략 코멘트는 자동 삭제되지 않으므로 탈퇴 전 직접 삭제해야 합니다.)' },
] as const;
