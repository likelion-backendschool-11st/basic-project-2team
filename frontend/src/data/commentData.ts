export type CommentSort = 'oldest' | 'newest';
/** public: 누구나 보는 댓글 · party: 참가가 확정된 파티원(공대장 + 승인된 파티원)만 보는 댓글 */
export type CommentChannel = 'public' | 'party';

/** 참가자 전용 댓글 작성자의 파티 정보 */
export interface CommentPartyMember {
  readonly isHost: boolean;
  readonly role: string | null;
  readonly mannerTemp: number;
}

export interface PostComment {
  readonly id: string;
  /** 작성자 회원 id (프로필 팝오버 조회용) */
  readonly authorId: number;
  /** Insertion order; used as the tie-breaker when sorting. */
  readonly seq: number;
  readonly parentId?: string;
  readonly author: string;
  readonly initial: string;
  readonly avatarUrl?: string | null;
  readonly badge?: 'mine' | 'author';
  /** 로그인한 사용자가 쓴 댓글 → 수정·삭제 버튼 */
  readonly mine: boolean;
  /** 볼 권한이 없는 비밀 댓글 (서버가 본문을 보내지 않음) */
  readonly locked: boolean;
  /** 관리자가 가린 댓글 → [펼쳐보기] 뒤에 표시 (REQ-Q&A-003) */
  readonly hidden: boolean;
  /** Minutes since posting; 0 renders as "방금 전". */
  readonly ageMin: number;
  readonly text: string;
  readonly secret?: boolean;
  readonly edited?: boolean;
  readonly reported?: boolean;
  /** 댓글 작성자가 채택한 답글 */
  readonly accepted?: boolean;
  /** 채택된 답글이 있는 댓글 (채택 완료 표시) */
  readonly solved?: boolean;
  /** 참가자 전용 목록에서 작성자의 파티 정보 (파티를 떠났으면 null) */
  readonly partyMember?: CommentPartyMember | null;
}

export const COMMENT_PAGE_SIZE = 4;
/** 댓글 영역 id — 투표 위젯의 「댓글로 의견 남기기」가 이곳으로 스크롤합니다. */
export const COMMENTS_ANCHOR_ID = 'post-comments';

/** 욕설 필터에 걸렸을 때 뜨는 경고 모달 (공고·댓글 공통) */
export const profanityDialog = { title: '부적절한 표현이 있어요', confirm: '확인했어요' } as const;

export const commentText = {
  title: '댓글',
  placeholder: '파티 댓글을 남겨 보세요.',
  replyPlaceholder: '답글을 입력하세요.',
  secret: '공대장 비밀글',
  submit: '댓글 등록',
  submitReply: '답글 등록',
  max: 500,
  sort: { oldest: '등록순', newest: '최신순' } as Record<CommentSort, string>,
  reply: '답글',
  report: '신고',
  reported: '신고됨',
  accept: '채택',
  cancelAccept: '채택 취소',
  solvedBadge: '채택 완료',
  pinnedTitle: '채택된 답글',
  repliesClose: (n: number) => `답글 ${n}개 접기`,
  repliesOpen: (n: number) => `답글 ${n}개 펼치기`,
  acceptedBadge: '채택된 답글',
  acceptedToast: '답글을 채택했습니다.',
  cancelAcceptedToast: '채택을 취소했습니다.',
  edit: '수정',
  remove: '삭제',
  save: '수정 완료',
  cancel: '취소',
  mine: '내 댓글',
  author: '작성자',
  secretView: '비밀 댓글입니다.',
  edited: '(수정됨)',
  justNow: '방금 전',
  empty: '첫 댓글을 남겨 보세요.',
  loading: '댓글을 불러오는 중입니다...',
  loadFailed: '댓글을 불러오지 못했습니다.',
  hiddenNotice: '관리자에 의해 가려진 댓글입니다.',
  showHidden: '펼쳐보기',
  added: '댓글이 등록되었습니다.',
  updated: '댓글이 수정되었습니다.',
  deleted: '댓글이 삭제되었습니다.',
  reportedToast: '신고가 접수되었습니다. 운영팀이 검토 후 조치합니다.',
  deleteDialog: { title: '댓글 삭제', description: '작성하신 댓글을 삭제하시겠습니까? 삭제된 댓글은 복구할 수 없으며, 답글이 있는 경우에도 작성자 정보와 내용이 영구 삭제 처리됩니다.', confirm: '삭제하기', cancel: '취소' },
  reportDialog: { title: '댓글 신고', description: '신고 사유를 선택해 주세요. 허위 신고는 제재될 수 있습니다.', detailLabel: '상세 내용 (선택)', detailPlaceholder: '신고 사유를 자세히 적어 주시면 검토에 도움이 됩니다.', detailMax: 500, confirm: '신고 접수하기', cancel: '취소' },
  popover: { title: '유저 프로필 카드', badge: '상세 정보', loading: '프로필을 불러오는 중...', loadFailed: '프로필을 불러오지 못했습니다.', invite: '파티 초대하기', invited: '파티 초대를 보냈습니다.' },
};

/** 참가자 전용 댓글 탭 — Stitch 「참가자 전용 댓글(공대원 시크릿 채널)」 */
export const partyCommentText = {
  publicTab: '전체 댓글',
  partyTab: '참가자 전용',
  partyTabNote: '확정 공대원 전용 공간',
  bannerTitle: '공대원 시크릿 채널',
  entered: (current: number, max: number) => `확정 ${current}/${max}명 입장`,
  bannerDescription: (current: number, max: number) =>
    `참가가 확정된 파티원(${current}/${max})만 열람 및 작성할 수 있는 시크릿 채널입니다. 배틀아이템, 공략 택틱, 출발 전 보이스 채널 준비 사항을 논의해보세요.`,
  host: '공대장',
  member: '파티원',
  formerMember: '前 파티원',
  verified: '공대원 인증',
  privateChip: '공대원 전용 비공개',
  manner: (temp: number) => `매너 ${temp.toFixed(1)}°C`,
  level: (level: number) => `Lv.${level}`,
  placeholder: '공대원에게 공유할 준비 사항이나 택틱을 남겨보세요. (예: 암호 수류탄, 성스러운 부적 챙겨왔습니다!)',
  submit: '공대원 댓글 등록',
  empty: '아직 공대원 댓글이 없습니다. 첫 준비 사항을 공유해 보세요.',
  lockedTitle: '참가가 확정된 파티원만 볼 수 있어요',
  lockedDescription: '파티 참가 신청이 승인되면 공대원끼리 준비 사항을 나누는 참가자 전용 댓글을 보고 쓸 수 있습니다.',
};

export const reportReasons: readonly string[] = ['욕설 및 비하 발언', '스팸 / 도배', '부적절한 광고', '개인정보 노출', '기타'];
