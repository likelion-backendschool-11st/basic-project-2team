export type CommentSort = 'oldest' | 'newest';

export interface PostComment {
  readonly id: string;
  /** Insertion order; used as the tie-breaker when sorting. */
  readonly seq: number;
  readonly parentId?: string;
  readonly author: string;
  readonly initial: string;
  readonly badge?: 'mine' | 'author';
  /** Minutes since posting; 0 renders as "방금 전". */
  readonly ageMin: number;
  readonly text: string;
  readonly secret?: boolean;
  readonly edited?: boolean;
  readonly reported?: boolean;
}

export const COMMENT_PAGE_SIZE = 4;
export const ME = '장인';

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
  added: '댓글이 등록되었습니다.',
  updated: '댓글이 수정되었습니다.',
  deleted: '댓글이 삭제되었습니다.',
  reportedToast: '신고가 접수되었습니다. 운영팀이 검토 후 조치합니다.',
  deleteDialog: { title: '댓글 삭제', description: '작성하신 댓글을 삭제하시겠습니까? 삭제된 댓글은 복구할 수 없으며, 답글이 있는 경우에도 작성자 정보와 내용이 영구 삭제 처리됩니다.', confirm: '삭제하기', cancel: '취소' },
  reportDialog: { title: '댓글 신고', description: '신고 사유를 선택해 주세요. 허위 신고는 제재될 수 있습니다.', confirm: '신고 접수하기', cancel: '취소' },
  popover: { battle: '전투정보실 바로가기', dm: '1:1 디스코드 쪽지', invite: '파티 초대하기', invited: '파티 초대를 보냈습니다.', dmSent: '쪽지 창을 열었습니다.' },
};

export const reportReasons: readonly string[] = ['욕설 및 비하 발언', '스팸 / 도배', '부적절한 광고', '개인정보 노출', '기타'];

export const initialComments: readonly PostComment[] = [
  { id: 'c1', seq: 1, author: '잭슨', initial: '잭', ageMin: 10, text: 'ex) 안녕하세요. 반갑습니다.' },
  { id: 'c2', seq: 2, parentId: 'c1', author: '전술가', initial: '전', badge: 'author', ageMin: 8, text: 'ex) 댓글 내용' },
  { id: 'c3', seq: 3, author: ME, initial: '장', badge: 'mine', ageMin: 5, text: 'ex) 댓글 내용' },
  { id: 'c4', seq: 4, author: '홀리한빛', initial: '홀', ageMin: 20, text: '극신속 홀나 1625입니다. 스펙 확인 부탁드려요!' },
  { id: 'c5', seq: 5, author: '붓끝의마법', initial: '붓', ageMin: 25, text: '도화가도 신청 가능한가요? 만개/해그리기 풀세팅 40열랭서입니다.' },
  { id: 'c6', seq: 6, author: '칼바람소울', initial: '칼', ageMin: 40, text: '3관문 격돌 담당 정해졌나요? 필요하면 제가 맡을게요.' },
  { id: 'c7', seq: 7, author: '달빛사냥꾼', initial: '달', ageMin: 55, text: '디코 채널 링크 알려주시면 바로 들어가겠습니다.' },
  { id: 'c8', seq: 8, author: '붉은달처자', initial: '붉', ageMin: 70, text: '오늘 22시 정각 출발 맞죠? 5분 전에 입장해 있을게요.' },
  { id: 'c9', seq: 9, author: '그림자은신', initial: '그', ageMin: 90, text: '1관문 낙사 기믹 오더는 누가 보시나요?' },
  { id: 'c10', seq: 10, author: '인파이터군', initial: '인', ageMin: 120, text: '관심 있어서 스크랩해 둡니다. 다음 파티도 기대할게요.' },
];
