import { boardPosts } from './boardData';
import { paths } from './routes';

/** Stitch screens: "공고글 상세 - 파티원 모드 / 작성자 모드" (project 15649597777945524469), comments (project 270338861769685965) */

export type PostStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';
export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'NO_SHOW';

export interface Participant {
  readonly name: string;
  readonly role: string;
  readonly leader?: boolean;
  readonly online: boolean;
}

export interface PostDetail {
  readonly id: string;
  readonly isOwner: boolean;
  readonly game: string;
  readonly raid: string;
  readonly title: string;
  readonly current: number;
  readonly max: number;
  readonly host: { readonly id: number; readonly name: string; readonly level: number; readonly record: string; readonly manner: string };
  readonly views: number;
  readonly postedAgo: string;
  readonly tiles: readonly { readonly icon: string; readonly label: string; readonly value: string; readonly note: string; readonly noteTone: 'good' | 'muted' }[];
  readonly intro: readonly string[];
  readonly steps: readonly string[];
  readonly pledgeTitle: string;
  readonly pledge: string;
  readonly tags: readonly string[];
  readonly slots: readonly { readonly role: string; readonly filled: number; readonly total: number }[];
  readonly conditions: readonly { readonly label: string; readonly value: string }[];
  readonly participants: readonly Participant[];
  readonly status: PostStatus;
  readonly commentCount: number;
  /** 로그인한 사용자 기준 (비로그인이면 false / null) */
  readonly scrapped: boolean;
  readonly applicationStatus: ApplicationStatus | null;
}

export interface RelatedPost {
  readonly id: string;
  readonly game: string;
  readonly title: string;
  readonly meta: string;
  readonly state: string;
  readonly to: string;
}

export function getRelatedPosts(postId: string): readonly RelatedPost[] {
  return boardPosts
    .filter((p) => p.id !== postId && p.category === 'mmorpg')
    .slice(0, 3)
    .map((p) => ({ id: p.id, game: p.game, title: p.title, meta: `${p.current}/${p.max}명`, state: p.membersTone === 'urgent' ? '마감임박' : '모집중', to: paths.postDetail(p.id) }));
}

/** 공고 상세 API 응답을 화면 문구로 바꿀 때 쓰는 문구 (api/postDetailApi.ts toPostDetail) */
export const postDetailText = {
  loading: '공고를 불러오는 중입니다...',
  loadFailed: '공고를 불러오지 못했습니다.',
  justNow: '방금 전',
  tileSchedule: '출발 예정 시각',
  tileVoice: '음성 소통 방식',
  tileSpec: '권장 스펙 기준',
  scheduleTbd: '일정 미정',
  scheduleTbdNote: '파티원 모집 후 일정 조율',
  departed: '출발 시각이 지났습니다',
  departIn: (left: string) => `약 ${left} 뒤 출발`,
  voiceOn: '마이크 필수',
  voiceOff: '음성 선택',
  voiceOnNote: '음성 채널 참여 필수',
  voiceOffNote: '채팅으로도 참여 가능',
  specNone: '제한 없음',
  styleAny: '상관 없음',
  hostRecord: (reviewCount: number) => `받은 매너 평가 ${reviewCount}건`,
  slotRole: '파티원',
  leaderRole: '파티장',
  conditionType: '유형',
  conditionDetail: '상세 분류',
  conditionStyle: '플레이 스타일',
  conditionSchedule: '플레이 일정',
  conditionSpec: '요구 수준',
  conditionVoice: '소통 방식',
  pledgeTitle: 'OurParty 클린 매너 서약',
  pledge: '실수해도 비난이나 핑 찍지 않고 서로 다독여주면서 끝까지 즐겁게 공략할 분만 모십니다. 중도 탈주나 먹튀 핑, 예의 없는 언행은 즉시 OurParty 비매너 센터 접수 및 시스템 제재가 부과됩니다.',
};

export const postText = {
  back: '메인 목록으로 돌아가기',
  toList: '목록으로',
  share: '공유',
  scrap: '공고 스크랩',
  scrapped: '스크랩됨',
  copyLink: '링크 복사',
  linkCopied: '링크가 복사되었습니다.',
  scrapAdded: '스크랩에 추가했습니다.',
  scrapRemoved: '스크랩을 해제했습니다.',
  recruiting: (c: number, m: number) => `모집중 ${c}/${m}`,
  almostFull: '마감 직전 (1자리 남음)',
  hostLabel: '방장',
  views: '조회',
  detailTitle: '상세 모집 안내',
  statusTitle: '실시간 공대 현황',
  recruitDone: (percent: number) => `${percent}% 모집 완료`,
  apply: '파티 신청하기 (원클릭)',
  applied: '신청 완료 · 방장 수락 대기',
  cancelApply: '신청 취소',
  guarantee: '클린 파티 보증제 적용 - 고의 탈주/비매너 신고 시 100% 영구 감점 및 패널티 부과',
  hostProfile: '공대장 프로필',
  topLeader: 'TOP LEADER',
  mannerTemp: '매너온도',
  hostQuote: '"실수해도 괜찮습니다. 공략 브리핑 끝까지 차분히 도와드려요!"',
  hostFollow: '공대장 파티 알림받기',
  followOn: '알림 받는 중',
  related: '비슷한 추천 공고',
  more: '더보기',
  // owner
  edit: '수정',
  remove: '삭제',
  waiting: (n: number) => `대기 중인 참여 신청 ${n}건`,
  waitingTag: '실시간 필수',
  waitingNote: '홀리한빛(1625 홀나), 붓끝의마법(1621 도화가)님이 승인 대기 중입니다.',
  manageApplicants: '신청자 목록 관리 / 승인',
  participantsTitle: '파티 참가자 명단',
  conditionsTitle: '파티 모집 상세 조건',
  closeRecruit: '공고 모집 마감 완료',
  pauseRecruit: '모집 일시 중단',
  resumeRecruit: '모집 재개',
  closedNote: '마감 처리 시 더 이상 추가 신청을 받지 않습니다.',
  closedBadge: '모집 마감',
  pausedBadge: '모집 중단',
  leaveParty: '파티 탈퇴',
  // dialogs
  deletePost: { title: '공고를 삭제할까요?', description: '삭제한 공고는 복구할 수 없습니다. 신청 중인 파티원에게도 알림이 전송됩니다.', confirm: '삭제', cancel: '취소' },
  disband: { title: '파티를 해산할까요?', description: '해산하면 참가자 전원에게 해산 알림이 전송되고, 공고는 종료 처리됩니다.', confirm: '해산', cancel: '아니오' },
  leave: { title: '파티에서 탈퇴할까요?', description: '탈퇴 후 재신청하려면 방장의 수락을 다시 받아야 하며, 잦은 탈퇴는 매너 점수에 반영될 수 있습니다.', confirm: '탈퇴', cancel: '아니오' },
  closeConfirm: { title: '모집을 마감할까요?', description: '마감하면 더 이상 신청을 받을 수 없고, 현재 참가자로 파티가 확정됩니다.', confirm: '마감', cancel: '취소' },
};
