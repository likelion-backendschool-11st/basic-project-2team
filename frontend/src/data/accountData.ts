import { ROUTES } from './routes';

/** Stitch screens: "마이페이지 - 프로필 수정 / 비밀번호 변경 / 회원 탈퇴하기" (project 15649597777945524469) */

export interface AccountNavItem {
  readonly id: 'profile' | 'password' | 'withdraw';
  readonly label: string;
  readonly icon: string;
  readonly to: string;
  readonly danger?: boolean;
}

export const accountProfile = {
  initial: '빛',
  nickname: '빛나는힐러',
  handle: 'user_party_9824',
} as const;

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
  nicknameHint: '2~10자의 한글, 영문, 숫자만 사용 가능해요',
  nicknameOk: '사용 가능한 닉네임입니다.',
  nicknameInvalid: '2~10자의 한글, 영문, 숫자만 사용할 수 있어요.',
  nicknameTaken: '이미 사용 중인 닉네임입니다.',
  checkButton: '중복 확인',
  gamesLabel: '선호하는 게임',
  gamesSub: '(복수 선택 가능)',
  gamesSelected: (n: number) => `${n}개 선택됨`,
  styleLabel: '플레이 스타일',
  save: '저장하기',
  saved: '프로필이 저장되었습니다.',
  maxNickname: 10,
  minNickname: 2,
  takenNicknames: ['관리자', '운영자', 'admin'] as readonly string[],
};

export const gameOptions: readonly GameOption[] = [
  { id: 'lostark', name: '로스트아크', genre: 'MMORPG' },
  { id: 'valorant', name: '발로란트', genre: 'FPS' },
  { id: 'lol', name: '리그오브레전드', genre: 'MOBA' },
  { id: 'overwatch', name: '오버워치 2', genre: 'FPS' },
  { id: 'maple', name: '메이플스토리', genre: 'MMORPG' },
  { id: 'helldivers', name: '헬다이버즈 2', genre: 'CO-OP' },
];

export const playStyles: readonly PlayStyleOption[] = [
  { id: 'casual', label: '즐겜 유저예요', description: '친목과 재미를 최우선으로 생각하며 파티원들과 소통을 즐기는 스타일입니다.' },
  { id: 'hardcore', label: '빡겜 지향이에요', description: '공략과 효율을 중시하며 클리어와 랭크 상승을 목표로 하는 스타일입니다.' },
  { id: 'voice', label: '보이스 필수예요', description: '디스코드 등 음성 소통을 기본으로 팀플레이를 하는 스타일입니다.' },
];

export const initialProfile = {
  nickname: '빛나는힐러',
  games: ['lostark', 'valorant', 'lol'] as readonly string[],
  styleId: 'casual',
};

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
  { id: 'next', label: '새 비밀번호', side: '영문, 숫자, 특수문자 조합', placeholder: '영문, 숫자, 특수문자 조합 8~16자', autoComplete: 'new-password' },
  { id: 'confirm', label: '새 비밀번호 확인', side: '비밀번호 재확인', placeholder: '새 비밀번호를 다시 입력해 주세요', autoComplete: 'new-password' },
];

export const passwordText = {
  verifyButton: '확인',
  verifyHint: '현재 비밀번호 입력 후 [확인]을 눌러주세요',
  verifyOk: '현재 비밀번호가 확인되었습니다.',
  verifyFail: '현재 비밀번호가 일치하지 않습니다.',
  /** Mock account password, only to demonstrate the verify step. */
  mockCurrent: 'party1234!',
  requirementsTitle: '보안 요구 조건 실시간 충족 상태',
  requirementPattern: '8~16자 / 영문+숫자+특수문자 필수',
  requirementMatch: '비밀번호 일치 확인',
  strengthLabel: '보안도:',
  strength: ['미입력', '취약', '보통', '안전'] as readonly string[],
  forgot: '현재 비밀번호를 잊으셨나요?',
  forgotNote: '로그아웃 후 비밀번호 찾기에서 재설정 가능',
  submit: '비밀번호 변경',
  done: '비밀번호가 변경되었습니다.',
  showLabel: '비밀번호 보기',
  hideLabel: '비밀번호 숨기기',
};

/* ───────── withdraw ───────── */

export const withdrawText = {
  heading: '정말 탈퇴하시겠어요?',
  description: '탈퇴하시면 현재까지 쌓아온 소중한 기록과 활동 데이터가 모두 파기되며, OurParty 서비스 재이용이 일정 기간 제한됩니다.',
  infoTitle: '탈퇴 시 즉시 삭제되는 정보',
  submit: '회원 탈퇴',
  keep: '다시 생각해볼게요',
};

export const withdrawRows = [
  { id: 'personal', icon: 'fa-regular fa-circle', label: '개인정보', body: '닉네임, 등록 이메일 계정, 프로필 아바타 이미지, 파티 매칭 활동 히스토리' },
  { id: 'activity', icon: 'fa-regular fa-id-card', label: '활동 및 인증', body: '연동된 게임 캐릭터(API 인증 토큰), 원정대 레이드 클리어 지표 및 친구 즐겨찾기 목록 일체 즉시 말소' },
] as const;

export const withdrawAgreements = [
  { id: 'irreversible', title: '위 안내사항을 모두 확인했으며, 탈퇴 후 데이터 복구가 불가능함을 이해했습니다.', note: '(삭제된 계정 정보 및 파티 매칭 기록은 어떠한 경우에도 복원되지 않습니다.)' },
  { id: 'leftover', title: "남아있는 게시글, 댓글은 '탈퇴한 사용자'로 표시됩니다.", note: '(작성하신 커뮤니티 파티 구인글 및 공략 코멘트는 자동 삭제되지 않으므로 탈퇴 전 직접 삭제해야 합니다.)' },
] as const;
