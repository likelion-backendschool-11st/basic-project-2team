import { MY_POST_ID } from './postData';
import { paths, ROUTES } from './routes';

export type GameAccent = 'amber' | 'blue' | 'rose';
export type PostStatus = 'completed' | 'closed' | 'open';
export type PresenceStatus = 'online' | 'away' | 'offline';
export type ActivityTab = 'posts' | 'comments';

export interface AccountMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly variant: 'primary' | 'default' | 'danger';
  readonly to: string;
  /** Render a divider above this item. */
  readonly dividerBefore?: boolean;
  readonly showChevron?: boolean;
}

export interface ProfileStat {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly highlight?: boolean;
}

export interface TopTag {
  readonly rank: 1 | 2 | 3;
  readonly label: string;
  readonly percent: string;
}

export interface ActivityPost {
  readonly id: string;
  readonly no: number;
  readonly game: string;
  readonly accent: GameAccent;
  readonly title: string;
  readonly members: string;
  readonly full: boolean;
  readonly date: string;
  readonly status: PostStatus;
  readonly to: string;
}

export interface ActivityComment {
  readonly id: string;
  readonly no: number;
  readonly game: string;
  readonly accent: GameAccent;
  readonly postTitle: string;
  readonly content: string;
  readonly date: string;
  readonly to: string;
}

export interface FavoriteUser {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly detail: string;
  readonly avatarUrl: string;
  readonly presence: PresenceStatus;
  readonly presenceLabel: string;
  readonly action: 'invite' | 'profile';
}

export const accountMenu = {
  title: '계정 관리',
  ariaLabel: '사이드 메뉴',
  contentAriaLabel: '마이페이지 상세 컨텐츠',
  items: [
    { id: 'edit-profile', label: '프로필 수정', icon: 'fa-pen', variant: 'primary', to: ROUTES.profileEdit, showChevron: true },
    { id: 'change-password', label: '비밀번호 변경', icon: 'fa-lock', variant: 'default', to: ROUTES.passwordChange },
    { id: 'withdraw', label: '회원 탈퇴', icon: 'fa-trash-can', variant: 'danger', to: ROUTES.withdraw, dividerBefore: true },
  ] as readonly AccountMenuItem[],
};

export const profileSummary = {
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAlJEqvgA9E1E2unlsNxqAsnK1FI6VGDK4h92FQ2Z2tquqLBJFIcq8gbjv9GuRXqfxtHXOnJN8ZUrYWd0KtuIcxaxAZqsK35y5Hm5HQFq-SEAIEdmQ6NNb2wtSn6HucmWRky03z8cC3QJqieuzW8RM1e06ybtvnwIriH2OxefIPHpgkZdYy0GyjH9CxAMGaUuGqBRiC4OZl8f_xoLrLj-txkFCuMYNcffxuaNQDlP7V',
  avatarAlt: '빛나는힐러 프로필 이미지',
  avatarCaption: '프로필 이미지',
  levelLabel: 'Lv.48',
  nickname: '빛나는힐러',
  positionBadge: '주포지션 서포터',
  fields: [
    { id: 'nickname', label: '닉네임 :' },
    { id: 'games', label: '선호하는 게임 :', value: '로스트아크, 리그 오브 레전드, 발로란트' },
    { id: 'style', label: '플레이 스타일 :', value: '즐겜 지향 / 보이스(디스코드) 선호 / 서포터·힐러 전담' },
  ],
  intro: '"멘탈 강하고 트라이 즐기는 힐러입니다. 언제든 편하게 말 걸어주세요!"',
  stats: [
    { id: 'posts', label: '게시글 수', value: '24', unit: '개' },
    { id: 'matched', label: '매칭된 파티 수', value: '156', unit: '회 완료', highlight: true },
  ] as readonly ProfileStat[],
  rating: {
    label: '유저 평점 (매너 온도)',
    score: '4.7',
    note: '(최근 30건 반영)',
    temperature: '98.4°C',
  },
  topTagsTitle: '유저들이 뽑은 태그 Top 3',
  topTagsCaption: '따뜻한 공대장',
  topTags: [
    { rank: 1, label: '#멘탈갑_긍정왕', percent: '94%' },
    { rank: 2, label: '#브리핑_장인', percent: '88%' },
    { rank: 3, label: '#시간엄수_칼출발', percent: '82%' },
  ] as readonly TopTag[],
  rankSuffix: '위',
};

export const activityText = {
  tabs: [
    { id: 'posts', label: '게시글', badge: '3' },
    { id: 'comments', label: '댓글' },
  ] as readonly { readonly id: ActivityTab; readonly label: string; readonly badge?: string }[],
  hint: '내가 모집한(참여한) 글 목록을 확인하고 파티 완료 여부를 제어합니다.',
  postsTitle: '내가 모집한(참여한) 글',
  postsCount: '총 3건 등록됨',
  commentsTitle: '내가 작성한 댓글',
  commentsCount: '총 3건 작성됨',
  columns: {
    no: '번호',
    game: '게임',
    title: '글 제목 또는 파티 내용',
    date: '작성일',
    status: '상태 / 조치',
    comment: '댓글 내용',
  },
  status: {
    completed: '활동 완료',
    closed: '매칭 종료',
    open: '활동 완료 처리',
  } as Record<PostStatus, string>,
  /** Total posts used for the "1-3 of 24개" range label. */
  totalPosts: 24,
  rangeSuffix: '개',
  pageSize: 3,
  prevLabel: '<',
  nextLabel: '>',
};

export const activityPosts: readonly ActivityPost[] = [
  { id: 'p1', no: 1, game: '로스트아크', accent: 'amber', title: '[로스트아크] 종익 트라이 저녁 8시부터 가실분', members: '(8/8)', full: true, date: '11-10', status: 'completed', to: paths.postDetail(MY_POST_ID) },
  { id: 'p2', no: 2, game: '리그 오브 레전드', accent: 'blue', title: '칼바람 5인 나락 즐겜팟 음성필수', members: '(5/5)', full: true, date: '11-08', status: 'closed', to: paths.postDetail('mmorpg-2') },
  { id: 'p3', no: 3, game: '발로란트', accent: 'rose', title: '골플 경쟁전 3인큐 구인 (연패 끊으실분)', members: '(2/3)', full: false, date: '11-12', status: 'open', to: paths.postDetail(MY_POST_ID) },
  { id: 'p4', no: 4, game: '로스트아크', accent: 'amber', title: '[로스트아크] 카멘 노말 1-3관 숙련팟 서폿 구해요', members: '(8/8)', full: true, date: '11-05', status: 'closed', to: paths.postDetail('mmorpg-4') },
  { id: 'p5', no: 5, game: '리그 오브 레전드', accent: 'blue', title: '자랭 골드~플래 3인 같이 올리실 분', members: '(5/5)', full: true, date: '11-03', status: 'closed', to: paths.postDetail('mmorpg-5') },
  { id: 'p6', no: 6, game: '발로란트', accent: 'rose', title: '언레 5인 즐겜 내전 인원 모집', members: '(10/10)', full: true, date: '11-01', status: 'closed', to: paths.postDetail('mmorpg-6') },
];

export const activityComments: readonly ActivityComment[] = [
  { id: 'c1', no: 1, game: '로스트아크', accent: 'amber', postTitle: '[로스트아크] 에키드나 하드 랏딜러 바로 출발합니다', content: '서폿 자리 남았으면 신청합니다! 1640 바드입니다.', date: '11-11', to: paths.postDetail('mmorpg-1') },
  { id: 'c2', no: 2, game: '리그 오브 레전드', accent: 'blue', postTitle: '[롤] 에메랄드~다이아 자유랭크 5인큐', content: '서폿 메인 에메2입니다. 디코 가능해요.', date: '11-09', to: paths.postDetail('mmorpg-2') },
  { id: 'c3', no: 3, game: '발로란트', accent: 'rose', postTitle: '[발로란트] 초월자 듀오나 3인팟', content: '세이지/스카이 가능합니다. 브리핑 잘 따라가요!', date: '11-07', to: paths.postDetail('mmorpg-3') },
];

export const favoritesText = {
  title: '즐겨찾기 한 유저 목록',
  countSuffix: '명',
  viewAll: '전체보기',
  viewAllTo: ROUTES.myPage,
  levelPrefix: 'Lv.',
  actions: {
    invite: '파티 초대',
    profile: '프로필',
  },
  presenceTitles: {
    online: '온라인',
    away: '자리비움',
    offline: '오프라인',
  } as Record<PresenceStatus, string>,
  avatarAltSuffix: ' 아바타',
};

export const favoriteUsers: readonly FavoriteUser[] = [
  {
    id: 'f1',
    name: '철수',
    level: 52,
    detail: '로스트아크 · 딜러',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDFLFDr_pOlp3YWn01tl3tkn2zDXiL98klc9a6cRHvwJdcb3pKh7gKTGgGsg8k4vUH3y0bwYuHR_KkU4kbTHiaic9NAXumUh4Flu8k9YgD6nTBp_Z4MKudfNHFTt1JVqNksICtgihrcbZ9ocMSF5HwvgC-GDOLZwMXeK9caIeqHgn_G2UFF3JD2L7rw8nuxwCVpHOD8woeliPpzIgJocNz0XVdIgIXTGx2rCuyToOuT',
    presence: 'online',
    presenceLabel: '온라인 (게임 중)',
    action: 'invite',
  },
  {
    id: 'f2',
    name: '짱구',
    level: 40,
    detail: '발로란트 · 타격대',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClwJLjYbdmDpmJrG2sWvARWl10WLqSSXWIp7sP7-wJ5N93eV1ADEfJRbK7Oc0tJA0qOKxGKWDcyM5CDeyEIM7-HOWx0VgVveBDmMLj_st21hJnDQtHKTZuNYOEZBODUYhmg-tTA-RpWLftuXJg_lazPubMKyfSEGYXhjIitIfHQ2ykp7oB7cxR04ELiNKCC3AS8t40rqXtmtewkP_aPCkRCoucnww8SzdzSRtNEUQl',
    presence: 'online',
    presenceLabel: '접속 중',
    action: 'invite',
  },
  {
    id: 'f3',
    name: '유리',
    level: 61,
    detail: '리그 오브 레전드 · 미드',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJiY0VhVKjYcWMc4IuIr3u7DhipuauZJK6YQgtQOzLGHgL9x4LYPs1ytppobjIAPiB9ggLAFMDnPhvQFjoKV7WB5FZUVADvaqFCmwuPYRob773M2FaqiViqdcWhCu_0aTLjE5KV4vd9go7m0itORF9Yw77SZ_avL7RM4nW_b2fCv752H_WN6mjmMARuTTmdBZmq_tS9rJREfS2HshWUXgySmXm_2UbL72_jEex_kcY',
    presence: 'away',
    presenceLabel: '자리 비움',
    action: 'profile',
  },
  {
    id: 'f4',
    name: '훈이',
    level: 35,
    detail: '로스트아크 · 워로드',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBAvCMSuDg-FrFCHCOGvvyIjRO08lQL-ve32nH3Hl6YzqYB9lGftBNvBzsmtiMN6jUVWePSZQHDA461IxVUdWsEgf9--YagMzZ4D_o7PXal3EPclb_aLM8ss-TCpmLAOGAi8kskfCysy6_ekLWlVjv97yyNCsMd6vzUzzJgvciXwYKi933chNIS6w-2RTfCFxiwqVhYEQB8G69zxOKSi305W-FTHRMIsMlNDlIlE0vd',
    presence: 'offline',
    presenceLabel: '오프라인 (2시간 전)',
    action: 'profile',
  },
];
