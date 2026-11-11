export interface ReviewMember {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly game: string;
  readonly className: string;
  readonly role: string;
}

export interface ReviewTag {
  readonly id: string;
  readonly label: string;
}

export const reviewMembers: readonly ReviewMember[] = [
  { id: 'm1', name: '철수', level: 52, game: '로스트아크', className: '버서커', role: '딜러' },
  { id: 'm2', name: '짱구', level: 40, game: '로스트아크', className: '홀리나이트', role: '서포터' },
  { id: 'm3', name: '유리', level: 61, game: '로스트아크', className: '소서리스', role: '딜러' },
  { id: 'm4', name: '훈이', level: 35, game: '로스트아크', className: '워로드', role: '딜러' },
  { id: 'm5', name: '맹구', level: 44, game: '로스트아크', className: '바드', role: '서포터' },
  { id: 'm6', name: '수지', level: 57, game: '로스트아크', className: '블레이드', role: '딜러' },
  { id: 'm7', name: '흰둥이', level: 39, game: '로스트아크', className: '건슬링어', role: '딜러' },
];

export const reviewTags: readonly ReviewTag[] = [
  { id: 'on-time', label: '#시간엄수' },
  { id: 'kind', label: '#친절함' },
  { id: 'mental', label: '#멘탈갑' },
  { id: 'skilled', label: '#높은숙련도' },
  { id: 'order', label: '#오더장인' },
  { id: 'briefing', label: '#브리핑장인' },
  { id: 'feedback', label: '#피드백수용' },
  { id: 'fun', label: '#즐겜매너' },
];

/** Phrase shown under the stars, indexed by rating (1–5). */
export const ratingPhrases: Record<number, string> = {
  0: '"별을 눌러 파티원을 평가해주세요"',
  1: '"아쉬운 점이 많았던 파티원이었어요"',
  2: '"조금 더 협력이 필요했어요"',
  3: '"무난하게 함께한 파티원이었어요"',
  4: '"믿고 함께할 수 있는 좋은 파티원이었어요"',
  5: '"완벽한 팀플레이를 보여준 최고의 파티원이었어요!"',
};

export const reviewDefaults = {
  rating: 5,
  maxRating: 5,
  maxLength: 500,
  text: '보스 패턴 브리핑도 침착하게 잘 이끌어주시고 딜 타이밍도 정확해서 수월하게 클리어했습니다! 다음 레이드에서도 꼭 다시 같이 가고 싶네요. 고생 많으셨습니다!',
  selectedTagIds: ['on-time', 'kind', 'mental', 'skilled', 'order'] as readonly string[],
};

export const reviewText = {
  title: '별점',
  subtitle: '파티원 평가',
  help: '도움말',
  close: '닫기',
  prevMember: '이전 파티원',
  nextMember: '다음 파티원',
  memberCounterSuffix: ' 파티원',
  levelPrefix: 'Lv.',
  starPrompt: '만족도 별점을 선택해주세요',
  starAriaSuffix: '점',
  star: '★',
  detailLabel: '상세 리뷰 작성',
  charSuffix: '자',
  placeholder:
    '함께 플레이한 파티원에 대한 상세한 후기를 남겨주세요 (예: 보이스 브리핑이 명확했고 기믹 수행 능력이 뛰어났습니다. 비방/욕설은 이용 제재될 수 있습니다).',
  tagLabel: '태그',
  tagHint: '(파티원 칭찬 키워드 선택)',
  tagSelectedSuffix: '개 선택됨',
  submit: '등록',
  submitNote: '작성하신 평가는 최종 승인 후 파티원 매너 온도에 반영됩니다.',
};

export const confirmText = {
  eyebrow: '최종 확인 안내',
  title: '리뷰를 등록 하시겠습니까?',
  descBefore: '선택하신 별점과 태그, 작성하신 후기는 파티원의 ',
  descHighlight: '매너 온도',
  descAfter: '에 즉시 반영되며, 등록 완료 후에는 수정하거나 삭제할 수 없습니다.',
  targetLabel: '평가 대상:',
  ratingLabel: '부여 별점:',
  tagsLabel: '선택 태그:',
  noTags: '선택 없음',
  tagsMorePrefix: ' 외 ',
  tagsMoreSuffix: '개',
  cancel: '취소',
  confirm: '확인',
  flowArrow: '➜',
};

/** Dimmed "MyPage party completion" content rendered behind the modal on /review. */
export const reviewBackdrop = {
  title: '내 파티 관리 및 완료 내역',
  description: '최근 활동을 종료한 파티 멤버들에게 신뢰도 평점을 남겨주세요.',
  statusBadge: '활동 완료 처리됨',
  party: {
    game: '로스트아크',
    title: '[군단장 레이드] 일리아칸 하드 1-3관문 반숙팟 트라이 (완료)',
    fields: [
      { id: 'time', label: '일시: ', value: '오늘 저녁 20:00', tone: 'default' },
      { id: 'members', label: '참여 인원: ', value: '8 / 8명', tone: 'default' },
      { id: 'leader', label: '공대장: ', value: '빛나는힐러 (본인)', tone: 'brand' },
      { id: 'status', label: '상태: ', value: '상호 평가 진행중 (1/7 완료)', tone: 'warn' },
    ] as readonly { readonly id: string; readonly label: string; readonly value: string; readonly tone: 'default' | 'brand' | 'warn' }[],
  },
};
