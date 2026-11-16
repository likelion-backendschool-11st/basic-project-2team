import { ROUTES } from './routes';

/** 푸터 링크로 여는 안내 페이지 (커뮤니티 소개 · 이용약관 · 개인정보처리방침 · 고객지원) */

export type InfoDocId = 'about' | 'terms' | 'privacy' | 'support';

/** 본문 한 덩어리: 문단(paragraphs)과 목록(items) 중 필요한 것만 씁니다. */
export interface InfoSection {
  readonly id: string;
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
}

export interface InfoDoc {
  readonly id: InfoDocId;
  readonly label: string;
  readonly icon: string;
  readonly to: string;
  readonly title: string;
  readonly summary: string;
  /** 약관류 문서의 시행일 (없으면 표시하지 않음) */
  readonly effectiveDate?: string;
  readonly sections: readonly InfoSection[];
}

export const infoText = {
  navLabel: '안내 문서',
  effectivePrefix: '시행일',
  contactTitle: '더 궁금한 점이 있나요?',
  contactBody: '계정 문제는 아래 링크에서 바로 해결할 수 있어요.',
  findId: '아이디 찾기',
  findPassword: '비밀번호 찾기',
};

export const infoDocs: Readonly<Record<InfoDocId, InfoDoc>> = {
  about: {
    id: 'about',
    label: '커뮤니티 소개',
    icon: 'fa-users',
    to: ROUTES.about,
    title: 'OurParty 커뮤니티 소개',
    summary: '혼자 큐 돌리다 지친 게이머들이 믿고 함께할 파티원을 찾는 곳입니다.',
    sections: [
      {
        id: 'what',
        heading: 'OurParty는 이런 곳이에요',
        paragraphs: [
          '로스트아크 레이드, 발로란트 경쟁전, LoL 듀오, 오버워치 빠른 대전까지 — 게임별로 파티 모집 공고를 올리고, 신청과 승인을 거쳐 파티를 꾸리는 커뮤니티입니다.',
          '플레이가 끝나면 함께한 파티원에게 별점과 태그로 매너 평가를 남기고, 그 결과는 매너 온도로 프로필에 차곡차곡 쌓입니다.',
        ],
      },
      {
        id: 'how',
        heading: '파티는 이렇게 꾸려져요',
        items: [
          '공고 작성 — 게임, 모집 인원, 일정, 플레이 스타일을 정해 공고를 올립니다.',
          '참가 신청 — 마음에 드는 공고에 신청하면 파티장이 승인 또는 거절합니다.',
          '모집 마감 · 플레이 — 인원이 차면 마감하고 함께 플레이합니다.',
          '활동 완료 · 매너 평가 — 파티장이 활동 완료를 누르면 파티원끼리 서로 평가를 남길 수 있습니다.',
        ],
      },
      {
        id: 'manner',
        heading: '매너 온도와 레벨',
        items: [
          '매너 온도 — 36.5℃에서 시작해 파티원들의 별점과 태그에 따라 오르내립니다. "이 사람과 또 하고 싶은가"를 보여주는 숫자예요.',
          '레벨 — 파티 완주, 공고·댓글 작성, 리뷰 작성으로 쌓이는 활동 점수에 따라 오릅니다. "얼마나 꾸준히 함께했는가"를 보여주는 숫자예요.',
        ],
      },
      {
        id: 'promise',
        heading: '우리의 약속',
        items: [
          '신고가 쌓인 댓글은 자동으로 가려지고, 관리자가 확인 후 처리합니다.',
          '비매너 이용자에게는 경고·기간 정지·영구 정지 등 단계별 제재가 적용됩니다.',
          '서비스에 꼭 필요한 개인정보만 수집합니다.',
        ],
      },
    ],
  },
  terms: {
    id: 'terms',
    label: '이용약관',
    icon: 'fa-file-contract',
    to: ROUTES.terms,
    title: '서비스 이용약관',
    summary: 'OurParty를 이용하실 때 지켜야 할 기본 약속입니다.',
    effectiveDate: '2026년 11월 16일',
    sections: [
      {
        id: 'purpose',
        heading: '제1조 (목적)',
        paragraphs: ['이 약관은 OurParty(이하 "서비스")가 제공하는 게임 파티원 모집 커뮤니티 서비스의 이용 조건과 절차, 회원과 서비스의 권리·의무를 정하는 것을 목적으로 합니다.'],
      },
      {
        id: 'member',
        heading: '제2조 (회원 가입과 계정)',
        items: [
          '회원 가입은 만 14세 이상만 할 수 있으며, 이용약관과 개인정보처리방침에 동의해야 합니다.',
          '아이디·닉네임·이메일·휴대폰 번호는 다른 회원과 중복될 수 없습니다.',
          '계정과 비밀번호의 관리 책임은 회원 본인에게 있으며, 다른 사람에게 양도하거나 빌려줄 수 없습니다.',
        ],
      },
      {
        id: 'posts',
        heading: '제3조 (공고·댓글·리뷰)',
        items: [
          '회원이 작성한 공고·댓글·리뷰의 책임은 작성자에게 있습니다.',
          '욕설, 혐오 표현, 개인정보 노출, 광고·도배, 게임 계정 거래 등은 금지되며, 서비스는 이를 가리거나 삭제할 수 있습니다.',
          '파티 평가는 실제로 함께 플레이한 파티원에 대해서만 남길 수 있으며, 허위 평가를 해서는 안 됩니다.',
        ],
      },
      {
        id: 'sanction',
        heading: '제4조 (신고와 제재)',
        items: [
          '회원은 약관을 위반한 댓글을 신고할 수 있습니다.',
          '서로 다른 회원 5명 이상이 신고한 댓글은 자동으로 가려지며, 관리자가 확인 후 복구하거나 처리합니다.',
          '위반 정도에 따라 경고, 기간 정지, 영구 정지가 적용될 수 있습니다.',
        ],
      },
      {
        id: 'withdraw',
        heading: '제5조 (회원 탈퇴)',
        items: [
          '회원은 마이페이지에서 언제든지 탈퇴할 수 있습니다. 단, 진행 중인 파티가 있으면 정리한 뒤 탈퇴할 수 있습니다.',
          '탈퇴 후에도 작성한 공고·댓글·리뷰는 삭제되지 않고 "탈퇴한 회원"으로 표시됩니다.',
          '제재 이력이 있는 회원은 탈퇴 후 일정 기간(경고·기간 정지 6개월, 영구 정지는 영구) 재가입이 제한됩니다.',
        ],
      },
      {
        id: 'disclaimer',
        heading: '제6조 (책임의 한계)',
        paragraphs: ['서비스는 회원 간 파티 모집을 연결하는 공간을 제공하며, 게임 안에서 회원 사이에 생긴 분쟁에 대해서는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.'],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    label: '개인정보처리방침',
    icon: 'fa-user-shield',
    to: ROUTES.privacy,
    title: '개인정보처리방침',
    summary: '어떤 정보를, 왜, 얼마나 보관하는지 알려드립니다.',
    effectiveDate: '2026년 11월 16일',
    sections: [
      {
        id: 'collect',
        heading: '1. 수집하는 개인정보',
        items: [
          '필수 — 아이디, 비밀번호(암호화하여 저장), 닉네임, 이메일, 휴대폰 번호',
          '선택 — 이름, 자기소개, 나이대, 선호 게임·플레이 스타일',
          '자동 수집 — 로그인 기록, 서비스 이용 기록(공고·댓글·신청·평가)',
        ],
      },
      {
        id: 'purpose',
        heading: '2. 이용 목적',
        items: [
          '회원 식별, 로그인, 아이디·비밀번호 찾기',
          '파티 모집·신청·승인, 알림 제공',
          '매너 온도·레벨 계산과 프로필 표시',
          '신고 처리와 부정 이용 방지',
        ],
      },
      {
        id: 'retention',
        heading: '3. 보관 기간과 파기',
        items: [
          '회원 탈퇴 시 아이디·닉네임·이메일·휴대폰 번호·이름·비밀번호·자기소개·나이대는 즉시 지웁니다.',
          '재가입 제한 확인을 위해 휴대폰 번호·이메일은 원문이 아닌 해시값으로만 보관합니다.',
          '해시값은 제재 이력이 없으면 30일 뒤, 제재 이력이 있으면 재가입 제한이 끝날 때 파기합니다.',
        ],
      },
      {
        id: 'public',
        heading: '4. 공개되는 정보',
        items: [
          '닉네임, 레벨, 매너 온도, 자기소개, 선호 게임은 다른 회원에게 보입니다.',
          '나이대는 프로필 수정에서 공개 여부를 직접 선택할 수 있습니다.',
          '이메일, 휴대폰 번호, 이름은 다른 회원에게 공개하지 않습니다.',
        ],
      },
      {
        id: 'third',
        heading: '5. 제3자 제공',
        paragraphs: ['회원의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 요구되는 경우는 예외로 합니다.'],
      },
      {
        id: 'rights',
        heading: '6. 회원의 권리',
        paragraphs: ['회원은 마이페이지에서 언제든지 자신의 정보를 확인·수정하고, 회원 탈퇴로 개인정보 처리를 중단할 수 있습니다.'],
      },
    ],
  },
  support: {
    id: 'support',
    label: '고객지원',
    icon: 'fa-headset',
    to: ROUTES.support,
    title: '고객지원',
    summary: '자주 묻는 질문을 모았어요. 대부분 여기서 해결됩니다.',
    sections: [
      {
        id: 'account',
        heading: 'Q. 아이디나 비밀번호가 기억나지 않아요.',
        paragraphs: ['로그인 화면의 [아이디 찾기]는 닉네임과 이메일로, [비밀번호 찾기]는 아이디와 이메일로 확인한 뒤 새 비밀번호를 설정할 수 있습니다.'],
      },
      {
        id: 'locked',
        heading: 'Q. 로그인이 잠겼어요.',
        paragraphs: ['비밀번호를 여러 번 틀리면 잠시 로그인이 잠깁니다. 잠시 후 다시 시도하거나 비밀번호 찾기로 재설정하면 잠금이 풀립니다.'],
      },
      {
        id: 'review',
        heading: 'Q. 매너 평가는 언제 남길 수 있나요?',
        paragraphs: ['파티장이 공고에서 [활동 완료]를 누르면, 마이페이지 활동 목록에 [별점 평가] 버튼이 나타납니다. 함께한 파티원에게만 평가를 남길 수 있습니다.'],
      },
      {
        id: 'level',
        heading: 'Q. 레벨은 어떻게 올리나요?',
        paragraphs: [
          '활동 점수가 쌓이면 레벨이 오릅니다. 파티 완료 +20점, 공고 작성 +10점(하루 3회까지), 리뷰 작성 +5점(1건마다), 댓글 작성 +2점(하루 10회까지)이에요. 하루는 한국 시간 자정에 바뀝니다.',
          '레벨 L에서 다음 레벨까지는 50 × L점이 필요해요. 공고나 댓글이 삭제되면 그 글로 받은 점수도 회수되고, 레벨이 내려갈 수 있습니다.',
        ],
      },
      {
        id: 'report',
        heading: 'Q. 비매너 이용자를 만났어요.',
        paragraphs: ['문제가 된 댓글의 [신고] 버튼으로 신고해 주세요. 관리자가 확인 후 가림·경고·정지 등 조치합니다.'],
      },
      {
        id: 'withdraw',
        heading: 'Q. 탈퇴가 안 돼요.',
        paragraphs: ['진행 중인 파티(모집 중·마감된 내 공고, 참여 중인 파티)가 있으면 탈퇴할 수 없습니다. 공고를 완료 처리하거나 참여를 정리한 뒤 다시 시도해 주세요.'],
      },
    ],
  },
};

export const infoDocOrder: readonly InfoDocId[] = ['about', 'terms', 'privacy', 'support'];
