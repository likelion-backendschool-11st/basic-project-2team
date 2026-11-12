# CLAUDE.md

이 파일은 Claude Code(및 팀원)가 이 저장소에서 작업할 때 참고하는 프로젝트 가이드입니다.
코드를 수정하기 전에 이 문서의 컨벤션을 먼저 확인해 주세요.

---

## 1. 프로젝트 개요

**OurParty** — 게임 파티원 모집 커뮤니티 (멋쟁이사자처럼 백엔드 스쿨 11기 기본 프로젝트 2팀)

로스트아크·발로란트·LoL·오버워치 등 게임별로 파티 모집 공고를 올리고, 신청·승인을 거쳐 파티를 꾸린 뒤
플레이가 끝나면 파티원끼리 **매너 평가(별점 + 태그)** 를 남기는 서비스입니다. 평가 결과는 **매너 온도**로 프로필에 누적됩니다.

### 주요 기능

| 영역 | 기능 |
| --- | --- |
| 인증/계정 | 회원가입(아이디·닉네임·이메일 중복확인, 이메일 인증, 약관동의), 로그인/로그아웃, 아이디 찾기, 비밀번호 찾기, 프로필 수정, 비밀번호 변경, 회원 탈퇴 |
| 메인 | 카테고리, 인기 공고, 마감 임박 공고, 매너 랭킹(명예의 전당), 빠른 검색 필터 |
| 게시판(공고) | 카테고리별 목록(`mmorpg`/`fps`/`aos`/`steam`/`etc`), 정렬(최신·조회수·마감임박), 태그 필터, 페이지네이션, 검색, 공고 작성(마크다운·임시저장), 공고 상세 |
| 파티 | 참가 신청/취소, (작성자) 신청자 승인·거절, 모집 마감, 스크랩, 링크 복사 |
| 댓글 | 댓글·대댓글, 비밀 댓글, 수정/삭제, 정렬, 신고 |
| 리뷰 | 파티 종료 후 파티원별 별점(1~5) + 태그(#시간엄수, #친절함 …) + 한 줄 평 |
| 마이페이지 | 프로필 요약/매너 온도, 내 공고·내 댓글 활동, 즐겨찾는 유저 |
| 관리자 | 대시보드, 신고 관리, 공고 관리, 회원 관리(경고·정지), 댓글 관리(가림·복구), 처리 이력 |

### 현재 상태

- 현재 저장소에는 **프론트엔드(`frontend/`)만** 존재합니다. 모든 화면은 `src/data/*.ts`의 **목(mock) 데이터**로 동작하며 실제 API 호출은 없습니다.
- 백엔드는 아직 구현 전입니다. 아래 [API 정의서](#4-api-정의서)는 화면·데이터 모델을 기준으로 정리한 **초안**이며, 백엔드 구현 시 이 문서를 함께 갱신합니다.
- 화면 디자인은 Google Stitch 시안을 기반으로 합니다(각 data 파일 상단 주석에 Stitch 화면명/ID 표기).

---

## 2. 사양 (개발 환경)

### 프론트엔드 (`frontend/`)

| 항목 | 버전 / 내용 |
| --- | --- |
| 런타임 | Node.js 18+ (권장 20 LTS), npm |
| 언어 | TypeScript ~5.6 (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) |
| 프레임워크 | React 18.3 |
| 빌드 도구 | Vite 5.4 (`@vitejs/plugin-react`) |
| 라우팅 | react-router-dom 6.30 — **`HashRouter`** 사용 (`/#/board` 형태) |
| 스타일 | Tailwind CSS 3.4 (+ `@tailwindcss/forms`, `@tailwindcss/container-queries`), PostCSS, Autoprefixer |
| 아이콘 | Font Awesome Free 7 (`fa-solid fa-...`, `fa-brands fa-...` 클래스) |
| 린트 | ESLint 9 (flat config) + typescript-eslint + react-hooks + react-refresh |
| 폰트 | Noto Sans KR, Plus Jakarta Sans |

### 명령어 (`frontend/` 에서 실행)

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 (http://localhost:5173)
npm run build     # 타입체크(tsc -b) + 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과 미리보기
npm run lint      # ESLint 검사
```

- `vite.config.ts`의 `base: './'` 와 `postbuild` 스크립트 덕분에 `dist/index.html`을 서버 없이 파일로 바로 열 수 있습니다. 이 동작을 깨뜨리지 않도록 주의하세요.
- 작업을 마치면 최소한 `npm run build` 와 `npm run lint` 가 통과하는지 확인합니다.

### 백엔드

- 미정 / 구현 예정. 스택(예: Java 17 + Spring Boot 3, JPA, MySQL 등)이 확정되면 이 섹션에 버전과 실행 방법을 추가합니다.

### 디렉터리 구조

```
frontend/
├── index.html
├── tailwind.config.js      # 디자인 토큰 (night / mercury / fog 팔레트)
├── vite.config.ts
└── src/
    ├── main.tsx            # 엔트리 (HashRouter, Font Awesome, index.css)
    ├── App.tsx             # 라우트 정의
    ├── index.css           # Tailwind 레이어, 전역 스타일
    ├── pages/              # 라우트 단위 페이지 (admin/ 하위에 관리자 페이지)
    ├── components/         # 도메인별 UI 컴포넌트 (auth, board, post, comments, review, mypage, admin, layout, ui …)
    ├── hooks/              # 상태·로직 커스텀 훅 (useXxx)
    └── data/               # 타입 정의 + 목 데이터 + 화면 문구(copy) + 라우트 상수
```

---

## 3. 코딩 컨벤션

### 3.1 아키텍처 원칙

- **페이지 → 훅 → 컴포넌트** 로 역할을 나눕니다.
  - `pages/`: 레이아웃 조립과 훅 연결만 담당합니다.
  - `hooks/`: 상태, 이벤트 핸들러, 파생 값 계산 등 **로직은 모두 훅으로** 분리합니다 (예: `useComments`, `useWriteForm`).
  - `components/`: props를 받아 그리는 **표현(presentational) 컴포넌트** 위주로 작성합니다.
- **데이터·문구는 `data/`에** 둡니다. 컴포넌트 안에 한글 문구, 옵션 목록, 목 데이터를 하드코딩하지 말고 `xxxText`, `xxxChoices` 같은 상수로 `data/` 파일에 정의해 import 합니다.
- 공통 UI(모달, 토스트, 확인 다이얼로그)는 `components/ui/` 와 `useModal`, `useToast` 를 재사용합니다.
- 백엔드 연동 시 API 호출 함수는 `src/api/`(신규)에 도메인별로 모으고, 훅에서 호출합니다. 컴포넌트에서 직접 `fetch` 하지 않습니다.

### 3.2 라우팅

- 경로 문자열을 직접 쓰지 말고 `data/routes.ts`의 상수를 사용합니다.
  - 정적 경로: `ROUTES.board`
  - 파라미터 경로: `paths.postDetail(id)`
- 새 페이지 추가 시: `ROUTES`(필요하면 `paths`)에 등록 → `App.tsx`에 `<Route>` 추가.

### 3.3 네이밍

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 컴포넌트 / 페이지 파일 | PascalCase `.tsx` | `PostRow.tsx`, `BoardPage.tsx` |
| 페이지 컴포넌트 | `XxxPage` | `PostDetailPage` |
| 훅 | `useXxx` camelCase `.ts` | `useBoardFilter.ts` |
| data 파일 | `xxxData.ts` | `boardData.ts` |
| 스타일 맵 파일 | `xxxStyles.ts` | `postStyles.ts` |
| 타입 / 인터페이스 | PascalCase | `BoardPost`, `SortKey` |
| Props 타입 | `XxxProps` | `PostRowProps` |
| 상수 (단일 값) | UPPER_SNAKE_CASE | `BOARD_PAGE_SIZE`, `MY_POST_ID` |
| 상수 (목록/객체) | camelCase | `boardCategories`, `writeText` |
| 이벤트 핸들러 | `onXxx`(props) / 동사형(훅 내부) | `onClose`, `confirmDelete` |

### 3.4 TypeScript

- `strict` 모드를 유지합니다. `any` 사용 금지 — 불가피하면 `unknown` 후 좁히기.
- 데이터 모델 필드와 props에는 **`readonly`** 를, 배열에는 **`readonly T[]`** 를 사용합니다.
- 유한한 값 집합은 문자열 리터럴 유니온 타입으로 정의합니다 (`type SortKey = 'recent' | 'views' | 'urgent'`).
- 타입만 가져올 때는 `import type` / `type` 수식어를 사용합니다 (`import { boardPosts, type BoardPost } from './boardData'`).
- 사용하지 않는 변수·매개변수는 남기지 않습니다 (빌드 실패).

### 3.5 React 컴포넌트

- 함수형 컴포넌트만 사용합니다. 기존 패턴을 따릅니다:

```tsx
import React from 'react';
import type { BoardPost } from '../../data/boardData';

interface PostRowProps {
  readonly post: BoardPost;
  readonly highlight?: string;
}

export const PostRow: React.FC<PostRowProps> = ({ post, highlight }) => (
  <tr>…</tr>
);

export default PostRow;
```

- 파일당 컴포넌트 1개, 파일명 = 컴포넌트명. named export + default export 를 함께 둡니다.
- 훅은 `export function useXxx()` 로 선언하고, 필요한 값/핸들러를 객체로 반환합니다.
- 리스트 렌더링 시 `key` 에는 index가 아닌 고유 `id` 를 사용합니다.
- 상태 업데이트는 불변성을 지킵니다 (`prev => prev.map(...)`, 스프레드 복사).
- 복잡한 함수 위에는 한 줄 JSDoc(`/** … */`)으로 의도를 적습니다 (영어/한국어 무관).

### 3.6 스타일 (Tailwind)

- 스타일은 Tailwind 유틸리티 클래스로 작성합니다. 별도 CSS 파일 추가는 지양하고, 꼭 필요하면 `index.css`의 `@layer` 에 추가합니다.
- 색상은 **`tailwind.config.js`의 디자인 토큰**을 사용합니다. 임의 HEX 값 사용 금지.
  - 배경: `night-base` / `night-surface` / `night-card` / `night-hover` / `night-deep`
  - 포인트: `mercury` (`mercury-light`, `mercury-dark`)
  - 텍스트: `fog-headline` / `fog-sub` / `fog-muted`
  - 상태: `emeraldAccent`, `amberAccent`, `roseAccent`
- 다크 테마 기반 UI입니다. 새 화면도 같은 톤을 유지합니다.
- 상태/톤별로 바뀌는 클래스는 `Record<Tone, string>` 맵으로 `xxxStyles.ts` 에 분리합니다 (예: `gameToneStyles`, `membersToneStyles`).
- 반복되는 클래스 묶음은 파일 상단 상수로 뽑습니다 (`const cell = 'py-3.5 px-4 text-center'`).

### 3.7 포맷 / 기타

- 들여쓰기 2칸, 작은따옴표(`'`), 세미콜론 사용, 여러 줄 객체·배열 끝에 trailing comma.
- import 순서: 외부 라이브러리 → 내부 컴포넌트 → data → hooks (기존 파일 순서를 따름).
- UI 문구는 한국어, 코드 식별자는 영어.

### 3.8 Git 컨벤션

- 브랜치: `main` 은 직접 push 하지 않고 기능 브랜치에서 PR 로 병합합니다.
  - `feat/기능명`, `fix/버그명`, `refactor/…`, `docs/…`, `chore/…`
- 커밋 메시지: `타입: 요약` (한국어 가능)
  - `feat` 기능 추가 · `fix` 버그 수정 · `refactor` 리팩터링 · `style` 포맷/스타일 · `docs` 문서 · `test` 테스트 · `chore` 빌드/설정
  - 예) `feat: 공고 상세 신청자 승인 기능 추가`
- `.env` 등 비밀 정보는 커밋하지 않습니다 (`.env.example` 만 허용).

---

## 4. API 정의서

> ⚠️ **초안** — 현재 프론트엔드 화면과 `src/data/*.ts` 의 데이터 모델을 기준으로 작성했습니다.
> 백엔드 구현 과정에서 변경되면 이 표와 프론트 타입을 함께 수정해 주세요.

### 4.1 공통 규칙

- Base URL: `/api` (관리자: `/api/admin`)
- 형식: `Content-Type: application/json; charset=UTF-8`
- 인증: 로그인 후 발급된 토큰을 `Authorization: Bearer {accessToken}` 헤더로 전달 (🔒 = 로그인 필요, 🛡️ = 관리자 권한)
- 날짜/시간: ISO-8601 문자열 (`2026-11-12T20:30:00+09:00`)
- 페이지네이션: 요청 `?page=1&size=8`, 응답 `{ items, page, size, totalCount, totalPages }`
- 응답 포맷

```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "POST_NOT_FOUND", "message": "존재하지 않는 공고입니다." } }
```

| HTTP 상태 | 의미 |
| --- | --- |
| 200 / 201 / 204 | 성공 / 생성됨 / 본문 없음 |
| 400 | 요청 값 검증 실패 |
| 401 | 인증 필요 / 토큰 만료 |
| 403 | 권한 없음 (작성자·관리자 아님, 정지 회원) |
| 404 | 리소스 없음 |
| 409 | 중복 (아이디/닉네임/이메일, 이미 신청함 등) |

### 4.2 인증 · 회원 (Auth / Member)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 | |
| GET | `/api/auth/check?type={userId\|nickname\|email}&value=` | 중복 확인 → `{ available: boolean }` | |
| POST | `/api/auth/email/send` | 이메일 인증코드 발송 `{ email }` | |
| POST | `/api/auth/email/verify` | 인증코드 확인 `{ email, code }` | |
| POST | `/api/auth/login` | 로그인 `{ userId, password, rememberMe }` → `{ accessToken, refreshToken, user }` | |
| POST | `/api/auth/logout` | 로그아웃 | 🔒 |
| POST | `/api/auth/refresh` | 토큰 재발급 | |
| POST | `/api/auth/find-id` | 아이디 찾기 `{ name, email }` | |
| POST | `/api/auth/find-password` | 비밀번호 재설정 메일 발송 `{ userId, email }` | |
| GET | `/api/members/me` | 내 정보 (`LoggedInUser`) | 🔒 |
| PATCH | `/api/members/me` | 프로필 수정 (닉네임, 소개, 주 게임, 플레이 스타일) | 🔒 |
| PATCH | `/api/members/me/password` | 비밀번호 변경 `{ currentPassword, newPassword }` | 🔒 |
| DELETE | `/api/members/me` | 회원 탈퇴 `{ password, reason }` | 🔒 |
| GET | `/api/members/{memberId}` | 다른 회원 프로필 (닉네임, 레벨, 매너 온도, 상위 태그) | |

**회원가입 요청 예시**

```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "address": "서울시 ...",
  "userId": "healer01",
  "nickname": "빛나는힐러",
  "password": "********",
  "email": "user@example.com",
  "agreements": { "terms": true, "privacy": true, "marketing": false }
}
```

**내 정보 응답 (`LoggedInUser`)**

```json
{ "id": "u-healer", "nickname": "빛나는힐러", "level": 48, "mannerTemp": 98.4, "avatarUrl": "https://...", "online": true }
```

### 4.3 공고 (Post)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts?category=&sort=&tags=&page=&size=` | 공고 목록 | |
| GET | `/api/posts/search?q=&tags=&page=&size=` | 공고 검색 | |
| GET | `/api/posts/popular` | 인기 공고 (메인) | |
| GET | `/api/posts/urgent` | 마감 임박 공고 (메인) | |
| GET | `/api/posts/{postId}` | 공고 상세 (조회수 +1) | |
| GET | `/api/posts/{postId}/related` | 관련 공고 | |
| POST | `/api/posts` | 공고 작성 | 🔒 |
| PUT | `/api/posts/{postId}` | 공고 수정 | 🔒 작성자 |
| DELETE | `/api/posts/{postId}` | 공고 삭제 | 🔒 작성자 |
| PATCH | `/api/posts/{postId}/status` | 모집 상태 변경 `{ status: "OPEN" \| "CLOSED" \| "COMPLETED" }` | 🔒 작성자 |
| POST | `/api/posts/drafts` | 임시저장 | 🔒 |
| GET | `/api/posts/drafts/latest` | 임시저장 불러오기 | 🔒 |
| POST / DELETE | `/api/posts/{postId}/scrap` | 스크랩 / 취소 | 🔒 |
| GET | `/api/categories` | 카테고리 목록 + 공고 수 | |

- `category`: `mmorpg` · `fps` · `aos` · `steam` · `etc` (생략 시 전체)
- `sort`: `recent`(기본) · `views` · `urgent`

**공고 작성 요청**

```json
{
  "title": "[카멘 1-3관] 1620+ 숙련 랏서폿 1분 모십니다",
  "body": "마크다운 본문",
  "partyName": "카멘 하드 숙련팟",
  "game": "lostark",
  "type": "raid",
  "detail": "kamen",
  "headcount": 7,
  "style": "hard",
  "schedule": "2026-11-15T21:00:00+09:00",
  "scheduleTbd": false,
  "voiceRequired": true,
  "tags": ["숙련", "디코필수"]
}
```

**공고 목록 아이템 (`BoardPost`)**

```json
{
  "id": "mmorpg-7", "category": "mmorpg", "game": "로스트아크",
  "title": "...", "current": 3, "max": 8, "tags": ["숙련"],
  "author": "빛나는오더", "createdAt": "2026-11-12T20:30:00+09:00", "views": 128,
  "status": "OPEN"
}
```

### 4.4 파티 참가 (Application)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/posts/{postId}/applications` | 참가 신청 `{ role, message }` | 🔒 |
| DELETE | `/api/posts/{postId}/applications/me` | 신청 취소 | 🔒 |
| GET | `/api/posts/{postId}/applications` | 신청자 목록 | 🔒 작성자 |
| PATCH | `/api/posts/{postId}/applications/{applicationId}` | 승인/거절 `{ status: "ACCEPTED" \| "REJECTED" }` | 🔒 작성자 |
| GET | `/api/posts/{postId}/participants` | 확정 파티원 목록 (`Participant[]`) | |

### 4.5 댓글 (Comment)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts/{postId}/comments?sort=oldest\|newest&page=&size=4` | 댓글 목록 (루트 댓글 기준 페이징, 대댓글 포함) | |
| POST | `/api/posts/{postId}/comments` | 댓글/대댓글 작성 `{ text, parentId?, secret }` | 🔒 |
| PATCH | `/api/comments/{commentId}` | 댓글 수정 `{ text }` | 🔒 작성자 |
| DELETE | `/api/comments/{commentId}` | 댓글 삭제 (대댓글 함께 삭제) | 🔒 작성자 |

- 비밀 댓글은 댓글 작성자와 공고 작성자에게만 본문을 노출합니다.

### 4.6 신고 (Report)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/reports` | 신고 `{ targetType: "USER"\|"NO_SHOW"\|"POST"\|"COMMENT", targetId, reason, detail? }` | 🔒 |

- `reason`: `욕설 및 비하 발언` · `스팸 / 도배` · `부적절한 광고` · `개인정보 노출` · `기타`

### 4.7 리뷰 · 매너 평가 (Review)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts/{postId}/reviews/targets` | 평가 대상 파티원 목록 (`ReviewMember[]`) | 🔒 파티원 |
| POST | `/api/posts/{postId}/reviews` | 파티원 평가 제출 | 🔒 파티원 |
| GET | `/api/review-tags` | 평가 태그 목록 | |

```json
{
  "reviews": [
    { "targetMemberId": "m1", "rating": 5, "tags": ["on-time", "kind"], "comment": "덕분에 한 번에 클리어했어요!" }
  ]
}
```

### 4.8 마이페이지 · 랭킹

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/members/me/summary` | 프로필 통계 (매너 온도, 파티 수, 상위 태그 Top3) | 🔒 |
| GET | `/api/members/me/posts?page=` | 내가 쓴 공고 | 🔒 |
| GET | `/api/members/me/comments?page=` | 내가 쓴 댓글 | 🔒 |
| GET | `/api/members/me/favorites` | 즐겨찾는 유저 목록 | 🔒 |
| POST / DELETE | `/api/members/me/favorites/{memberId}` | 즐겨찾기 추가 / 해제 | 🔒 |
| GET | `/api/rankings/manner` | 매너 랭킹 (메인 명예의 전당) | |

### 4.9 관리자 (Admin) 🛡️

| Method | URI | 설명 |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | 대시보드 통계 |
| GET | `/api/admin/reports?status=&type=&page=` | 신고 목록 (`status`: 접수·처리 중·완료·기각) |
| GET | `/api/admin/reports/{reportId}` | 신고 상세 |
| PATCH | `/api/admin/reports/{reportId}` | 신고 처리 `{ status, action, memo }` |
| GET | `/api/admin/posts?status=&q=&page=` | 공고 목록 (`status`: 모집 중·마감·종료·삭제됨) |
| GET | `/api/admin/posts/{postId}` | 공고 상세 |
| DELETE | `/api/admin/posts/{postId}` | 공고 삭제 `{ reason }` |
| GET | `/api/admin/members?status=&q=&page=` | 회원 목록 (`status`: 정상·경고·이용 정지·영구 정지·탈퇴) |
| GET | `/api/admin/members/{memberId}` | 회원 상세 |
| POST | `/api/admin/members/{memberId}/sanctions` | 제재 `{ type: "WARNING"\|"SUSPEND"\|"BAN", days?, reason }` |
| GET | `/api/admin/comments?status=&q=&page=` | 댓글 목록 (`status`: 정상·신고됨·가림·삭제) |
| PATCH | `/api/admin/comments/{commentId}` | 댓글 가림/복구/삭제 `{ status, reason }` |
| GET | `/api/admin/history?kind=&page=` | 관리자 처리 이력 |

> 상태 값은 화면에는 한글로 표시하지만, API에서는 영문 enum(`RECEIVED`, `IN_PROGRESS`, `DONE`, `REJECTED` 등)으로 주고받고 프론트에서 매핑하는 것을 권장합니다.

---

## 5. Claude 작업 시 참고 사항

- 새 기능을 만들 때 기존 같은 도메인의 `data/` → `hooks/` → `components/` → `pages/` 파일을 먼저 읽고 패턴을 맞춥니다.
- 목 데이터를 실제 API로 교체할 때는 `data/` 의 타입 정의를 API 응답 타입으로 재사용하고, 목 상수는 연동이 끝난 뒤 제거합니다.
- API 스펙을 바꾸면 이 문서의 [4. API 정의서](#4-api-정의서) 도 함께 수정합니다.
- 변경 후 `frontend/` 에서 `npm run build` 와 `npm run lint` 를 실행해 확인합니다.
