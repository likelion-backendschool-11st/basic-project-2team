/** Stitch screen: "OurParty 공고글 작성하기" (262fbf52487f4fddb91379d500854527) */

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface StyleOption {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
}

export interface ToolbarAction {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  /** Text inserted around (or before, for line prefixes) the selection. */
  readonly before: string;
  readonly after?: string;
}

export const writeText = {
  crumbRoot: '파티 찾기',
  crumbCurrent: '공고글 작성하기',
  draftSaved: (time: string) => `임시저장됨 (${time})`,
  draftButton: '임시저장',
  draftLoaded: '임시저장된 글을 불러왔습니다.',
  draftSaveFailed: '임시저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
  draftNeedLogin: '임시저장은 로그인 후 사용할 수 있습니다.',
  leave: '나가기',
  titleLabel: '공고글 제목',
  titlePlaceholder: '예) [카멘 1-3관] 1620+ 숙련 랏서폿 1분 모십니다',
  bodyPlaceholder: '모집 내용을 자세히 적어주세요. 출발 시간, 현재 구성, 참여 조건 등을 알려주시면 더 빨리 파티가 모입니다.',
  markdown: 'Markdown 지원',
  charCount: '글자수:',
  readTime: '예상 읽는 시간:',
  active: '작성창 활성화됨',
  preview: '미리보기',
  previewClose: '편집으로 돌아가기',
  syncNote: '등록 시 OurParty 게시판 및 실시간 매칭 채널에 자동 동기화됩니다.',
  submit: '게시하기',
  submitInvalid: '제목과 본문을 입력해 주세요.',
  placeholders: { game: '게임을 선택해주세요', type: '모집 유형을 선택해주세요', detail: '상세 분류를 선택해주세요' },
  optionsLoadFailed: '게임 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.',
  submitFailed: '공고 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
  panelTitle: '파티 모집 상세 설정',
  panelBadge: 'MATCH OPTION',
  section1: 'SECTION 1. 기본 정보',
  section1Side: '필수 항목',
  section2: 'SECTION 2. 일정 & 조건',
  section2Side: '세부 조율',
  partyName: '파티 명',
  partyNameSide: '메인 노출명',
  partyNamePlaceholder: '예) 카멘 1-3관 숙련 쾌속팟',
  game: '게임 선택',
  type: '모집 유형',
  detail: '상세 분류 (보스/던전명)',
  headcount: '모집 인원',
  headcountNote: '작성자를 포함한 전체 파티 인원을 설정하세요',
  style: '선호 플레이 스타일',
  schedule: '플레이 일정',
  scheduleTbd: '일정 미정',
  scheduleNote: '일정이 미정으로 등록되면 파티원 모집 후 조율됩니다.',
  voice: '마이크 필수',
  summary: '선택 상태 요약:',
  draftConfirm: { title: '작성을 취소할까요?', description: '지금 나가면 작성 중인 내용이 사라집니다. 임시저장을 하면 나중에 이어서 쓸 수 있어요.', confirm: '작성 취소', cancel: '계속 작성' },
};

/** 모집 유형 코드(GET /api/games 의 contents[].type) → 화면 표시 이름 */
export const typeLabels: Readonly<Record<string, string>> = {
  raid: '레이드',
  dungeon: '던전',
  rank: '경쟁전 / 랭크',
  normal: '일반 게임',
};

export const HEADCOUNT_MIN = 2;
export const HEADCOUNT_MAX = 16;

export const styleChoices: readonly StyleOption[] = [
  { id: 'hard', emoji: '⚡', label: '빡겜 / 클리어 지향' },
  { id: 'casual', emoji: '🍵', label: '즐겜 / 친목 지향' },
  { id: 'newbie', emoji: '🌱', label: '초보/트라이 배려' },
  { id: 'any', emoji: '🎲', label: '상관 없음' },
];

export const toolbarActions: readonly ToolbarAction[] = [
  { id: 'bold', icon: 'fa-bold', label: '굵게', before: '**', after: '**' },
  { id: 'italic', icon: 'fa-italic', label: '기울임', before: '*', after: '*' },
  { id: 'heading', icon: 'fa-heading', label: '제목', before: '# ' },
  { id: 'list', icon: 'fa-list', label: '목록', before: '- ' },
  { id: 'quote', icon: 'fa-comment-dots', label: '인용', before: '> ' },
  { id: 'code', icon: 'fa-code', label: '코드', before: '`', after: '`' },
  { id: 'image', icon: 'fa-image', label: '이미지', before: '![이미지 설명](', after: ')' },
  { id: 'link', icon: 'fa-link', label: '링크', before: '[링크 이름](', after: ')' },
];

export const initialDraft = {
  title: '',
  body: '',
  partyName: '',
  // 게임·모집 유형·상세 분류는 GET /api/games 로 불러온 뒤 채웁니다.
  game: '',
  type: '',
  detail: '',
  headcount: 8,
  style: 'hard',
  tbd: true,
  date: '2024-05-17',
  time: '22:00',
  voice: true,
};
