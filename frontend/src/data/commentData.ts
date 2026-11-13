export type CommentSort = 'oldest' | 'newest';

export interface PostComment {
  readonly id: string;
  /** 작성자 회원 id (프로필 팝오버 조회용) */
  readonly authorId: number;
  /** Insertion order; used as the tie-breaker when sorting. */
  readonly seq: number;
  readonly parentId?: string;
  readonly author: string;
  readonly initial: string;
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
}

export const COMMENT_PAGE_SIZE = 4;

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

export const reportReasons: readonly string[] = ['욕설 및 비하 발언', '스팸 / 도배', '부적절한 광고', '개인정보 노출', '기타'];
