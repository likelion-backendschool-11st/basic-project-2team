import { boardPosts, type BoardPost } from './boardData';
import { popularPosts, urgentPosts } from './homeData';
import { paths } from './routes';

/** Stitch screens: "공고글 상세 - 파티원 모드 / 작성자 모드" (project 15649597777945524469), comments (project 270338861769685965) */

/** The post that "my" account wrote; opening it shows the owner view. */
export const MY_POST_ID = 'mmorpg-7';

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
  readonly host: { readonly name: string; readonly level: number; readonly record: string; readonly manner: string };
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
}

export interface RelatedPost {
  readonly id: string;
  readonly game: string;
  readonly title: string;
  readonly meta: string;
  readonly state: string;
  readonly to: string;
}

const participants: readonly Participant[] = [
  { name: '빛나는오더', role: '워로드', leader: true, online: true },
  { name: '칼바람소울', role: '소울이터', online: true },
  { name: '붉은달처자', role: '슬레이어', online: true },
  { name: '달빛사냥꾼', role: '건슬링어', online: true },
  { name: '인파이터군', role: '인파이터', online: true },
  { name: '그림자은신', role: '리퍼', online: true },
  { name: '성검의빛', role: '홀리나이트', online: false },
];

const toPost = (postId: string, post: BoardPost | undefined): Pick<PostDetail, 'game' | 'title' | 'current' | 'max'> => {
  if (post) return { game: post.game, title: post.title, current: post.current, max: post.max };
  // Home-page cards use their own ids (p1, u1…); show the same title they advertised.
  const card = [...popularPosts, ...urgentPosts].find((p) => p.id === postId);
  const [current, max] = (card && 'members' in card ? card.members : '7/8').split('/').map((n) => parseInt(n, 10) || 0);
  return { game: card && 'category' in card ? card.category : '로스트아크', title: card?.title ?? '카멘 1-3관 1620+ 숙련 랏서폿 1분 모십니다', current: current || 7, max: max || 8 };
};

export function getPostDetail(postId: string): PostDetail {
  const post = boardPosts.find((p) => p.id === postId);
  const base = toPost(postId, post);
  const isOwner = postId === MY_POST_ID;
  return {
    id: postId,
    isOwner,
    ...base,
    raid: '군단장 레이드',
    host: { name: isOwner ? '빛나는힐러' : (post?.author ?? '빛나는오더'), level: 52, record: '레이드 지휘 184회 완료 · 클린 인증 파티', manner: '99.8℃' },
    views: (post?.views ?? 38) * 9,
    postedAgo: '15분 전',
    tiles: [
      { icon: 'fa-regular fa-clock', label: '출발 예정 시각', value: '오늘 밤 10:30', note: '약 25분 뒤 출발 대기', noteTone: 'good' },
      { icon: 'fa-solid fa-headset', label: '음성 소통 방식', value: '디스코드 필참', note: '듣톡 가능 / 브리핑 위주', noteTone: 'muted' },
      { icon: 'fa-regular fa-circle-check', label: '권장 스펙 기준', value: '1620+ / 서포터 1명', note: '선각자/달인 40 우대', noteTone: 'muted' },
    ],
    intro: [
      '안녕하세요! 카멘 하드 1-3관문 클린팟 지향 랏서폿 구인 파티입니다.',
      '현재 딜러 6명, 서폿 1명 세팅 완료되었으며, 4파티 랏서폿 (바드 / 도화가 / 홀리나이트) 1자리만 남았습니다. 참여 공대원 전원 평균 1625+ 숙련자분들이며, 디스코드에서 핵심 기믹 위주로 침착하게 브리핑 진행합니다.',
    ],
    steps: ['1관문 칼델 및 낙사 기믹 완숙', '2관문 발타자르 분신 파훼 오더 신속 이행', '3관문 격돌 1, 2번 담당 지정 완료 (지원 서포터님 격돌 부담 없음)'],
    pledgeTitle: 'OurParty 클린 매너 서약',
    pledge: '실수해도 비난이나 핑 찍지 않고 서로 다독여주면서 끝까지 즐겁게 공략할 분만 모십니다. 중도 탈주나 먹튀 핑, 예의 없는 언행은 즉시 OurParty 비매너 센터 접수 및 시스템 제재가 부과됩니다.',
    tags: ['카멘숙련', '랏서폿', '디스코드필수', '멘탈최상', '클린파티보증'],
    slots: [
      { role: '딜러 (DPS)', filled: 6, total: 6 },
      { role: '서포터 (SUP)', filled: 1, total: 2 },
    ],
    conditions: [
      { label: '유형', value: '군단장 레이드 (어비스/하드)' },
      { label: '상세 분류', value: '어둠군단장 카멘 · 1-3관' },
      { label: '플레이 스타일', value: '빡겜 / 원클 클리어 지향 ⚡' },
      { label: '출발 카운트다운', value: 'D-0 06:14:32' },
      { label: '플레이 일정', value: '2025. 05. 17. (토) 22:00 ~ 23:30 (예상)' },
      { label: '요구 수준', value: '숙련 (클리어 경험자)' },
      { label: '소통 방식', value: '마이크 음성 필수' },
    ],
    participants,
  };
}

export function getRelatedPosts(postId: string): readonly RelatedPost[] {
  return boardPosts
    .filter((p) => p.id !== postId && p.category === 'mmorpg')
    .slice(0, 3)
    .map((p) => ({ id: p.id, game: p.game, title: p.title, meta: `${p.current}/${p.max}명`, state: p.membersTone === 'urgent' ? '마감임박' : '모집중', to: paths.postDetail(p.id) }));
}

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
