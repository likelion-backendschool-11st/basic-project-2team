# 코딩 컨벤션

OurParty의 코딩 컨벤션입니다. 1~7절은 프론트엔드(`frontend/`), 8절은 백엔드(`backend/`), 9절은 Git 규칙입니다. 프로젝트 개요와 개발 환경은 [CLAUDE.md](../CLAUDE.md)를 참고하세요.

## 1. 아키텍처 원칙

- **페이지 → 훅 → 컴포넌트** 로 역할을 나눕니다.
  - `pages/`: 레이아웃 조립과 훅 연결만 담당합니다.
  - `hooks/`: 상태, 이벤트 핸들러, 파생 값 계산 등 **로직은 모두 훅으로** 분리합니다 (예: `useComments`, `useWriteForm`).
  - `components/`: props를 받아 그리는 **표현(presentational) 컴포넌트** 위주로 작성합니다.
- **데이터·문구는 `data/`에** 둡니다. 컴포넌트 안에 한글 문구, 옵션 목록, 목 데이터를 하드코딩하지 말고 `xxxText`, `xxxChoices` 같은 상수로 `data/` 파일에 정의해 import 합니다.
- 공통 UI(모달, 토스트, 확인 다이얼로그)는 `components/ui/` 와 `useModal`, `useToast` 를 재사용합니다.
- 백엔드 연동 시 API 호출 함수는 `src/api/`(신규)에 도메인별로 모으고, 훅에서 호출합니다. 컴포넌트에서 직접 `fetch` 하지 않습니다.

## 2. 라우팅

- 경로 문자열을 직접 쓰지 말고 `data/routes.ts`의 상수를 사용합니다.
  - 정적 경로: `ROUTES.board`
  - 파라미터 경로: `paths.postDetail(id)`
- 새 페이지 추가 시: `ROUTES`(필요하면 `paths`)에 등록 → 해당 도메인의 `src/routes/xxxRoutes.tsx` 에 라우트 추가. `App.tsx` 는 수정하지 않습니다 (새 도메인 파일을 만들 때만 한 줄 추가).

## 3. 네이밍

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

## 4. TypeScript

- `strict` 모드를 유지합니다. `any` 사용 금지 — 불가피하면 `unknown` 후 좁히기.
- 데이터 모델 필드와 props에는 **`readonly`** 를, 배열에는 **`readonly T[]`** 를 사용합니다.
- 유한한 값 집합은 문자열 리터럴 유니온 타입으로 정의합니다 (`type SortKey = 'recent' | 'views' | 'urgent'`).
- 타입만 가져올 때는 `import type` / `type` 수식어를 사용합니다 (`import { boardPosts, type BoardPost } from './boardData'`).
- 사용하지 않는 변수·매개변수는 남기지 않습니다 (빌드 실패).

## 5. React 컴포넌트

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

## 6. 스타일 (Tailwind)

- 스타일은 Tailwind 유틸리티 클래스로 작성합니다. 별도 CSS 파일 추가는 지양하고, 꼭 필요하면 `index.css`의 `@layer` 에 추가합니다.
- 색상은 **`tailwind.config.js`의 디자인 토큰**을 사용합니다. 임의 HEX 값 사용 금지.
  - 배경: `night-base` / `night-surface` / `night-card` / `night-hover` / `night-deep`
  - 포인트: `mercury` (`mercury-light`, `mercury-dark`)
  - 텍스트: `fog-headline` / `fog-sub` / `fog-muted`
  - 상태: `emeraldAccent`, `amberAccent`, `roseAccent`
- 다크 테마 기반 UI입니다. 새 화면도 같은 톤을 유지합니다.
- 상태/톤별로 바뀌는 클래스는 `Record<Tone, string>` 맵으로 `xxxStyles.ts` 에 분리합니다 (예: `gameToneStyles`, `membersToneStyles`).
- 반복되는 클래스 묶음은 파일 상단 상수로 뽑습니다 (`const cell = 'py-3.5 px-4 text-center'`).

## 7. 포맷 / 기타

- 들여쓰기 2칸, 작은따옴표(`'`), 세미콜론 사용, 여러 줄 객체·배열 끝에 trailing comma.
- import 순서: 외부 라이브러리 → 내부 컴포넌트 → data → hooks (기존 파일 순서를 따름).
- UI 문구는 한국어, 코드 식별자는 영어.

## 8. 백엔드 (`backend/`)

Express 5 (CommonJS) + mysql2 기반입니다. 실행 방법과 환경 변수는 [CLAUDE.md](../CLAUDE.md) 2절을 참고하세요.

### 8.1 계층 구조

도메인별로 `src/<domain>/` 폴더를 만들고 아래 역할로 파일을 나눕니다. 위 계층만 아래 계층을 호출합니다.

| 파일 | 역할 | 하지 않는 일 |
| --- | --- | --- |
| `xxxRoutes.js` | URL·HTTP 메서드와 인증 미들웨어(`requireAuth`, `optionalAuth`, `requireAdmin`)를 Controller 함수에 연결 | 로직 |
| `xxxController.js` | `req` 에서 값을 꺼내 Service 에 넘기고, 결과를 `sendSuccess` 로 응답 (본문 없는 응답은 `res.status(204).end()`) | 비즈니스 규칙, SQL |
| `xxxService.js` | 비즈니스 규칙, 권한·상태 확인, 실패 시 `ApiError` throw | `req`/`res` 사용, SQL |
| `xxxRepository.js` | SQL 실행과 트랜잭션(`beginTransaction` / `commit` / `rollback`), DB 행 → 객체 변환 | `ApiError` throw, HTTP 상태 판단 |
| `xxxValidator.js` | 요청 값 검증·정규화. 실패하면 400 `INVALID_INPUT`(필드별 `fields`) | DB 조회 |
| `xxxConstants.js` | 에러 코드, 사용자 문구, 정규식, 상태값 | – |
| `index.js` | Repository → Service → Controller → Router 를 조립하는 `createXxxModule()` | – |

- 각 계층은 `createXxx(의존성)` 팩토리 함수로 만들고, 의존성(`pool`, repository, `now` 등)은 인자로 받습니다. 테스트에서 repository 를 가짜로 바꿔 끼우기 위해서입니다.
- 여러 도메인이 함께 쓰는 코드(인증 미들웨어, JWT, 응답 헬퍼, 이벤트)는 `src/common/` 에 둡니다.
- 경로 문자열이 겹치면 먼저 마운트된 라우터가 이깁니다. `/api/posts/popular` 처럼 고정 경로는 `/:postId` 를 잡는 라우터보다 먼저 마운트합니다 (`app.js` 주석 참고).

### 8.2 응답 · 에러 처리

- 응답 형식은 [API_SPEC.md](./API_SPEC.md) 1절을 따릅니다. 성공은 `{ success: true, data }`, 실패는 `{ success: false, error: { code, message, fields? } }` 입니다.
- 성공 응답은 `common/response.js` 의 `sendSuccess(res, status, data)` 로만 보냅니다. `res.json()` 을 직접 쓰지 않습니다.
- 실패는 Service·Validator 에서 `throw new ApiError(status, code, message, fields?, details?)` 로 알리고, `common/errorHandler.js` 가 응답으로 바꿉니다.
- Controller 에 `try/catch` 를 쓰지 않습니다. Express 5 는 async 핸들러의 reject 를 에러 핸들러로 넘깁니다.
- 예상하지 못한 오류는 500 `INTERNAL_SERVER_ERROR` 로 응답하고, 원인은 서버 로그에만 남깁니다 (응답에 스택·SQL 노출 금지).
- 에러 코드는 영문 `UPPER_SNAKE_CASE`(예: `POST_NOT_FOUND`), 메시지는 사용자에게 보여줄 한국어 문장으로 `xxxConstants.js` 에 둡니다.

### 8.3 보안

- 비밀번호는 `bcryptjs` 로 해시해 `password_hash` 에만 저장하고, 비교는 `bcrypt.compare` 로 합니다. 해시 강도는 `BCRYPT_ROUNDS` 환경 변수로 정합니다.
- 리프레시 토큰·비밀번호 재설정 토큰은 원문 대신 SHA-256 해시를 저장합니다.
- `password_hash` 등 민감 컬럼은 응답 객체에 넣지 않고, `SELECT *` 대신 필요한 컬럼만 조회합니다.
- SQL 은 항상 `?` 자리표시자로 값을 넘깁니다. 사용자 입력을 SQL 문자열에 직접 이어 붙이지 않습니다 (`LIKE` 검색어는 `%`, `_` 이스케이프).

### 8.4 환경 변수

- 환경 변수는 `src/config/env.js` 에서 한 번만 읽고, 다른 파일은 `env` 객체를 사용합니다. `process.env` 를 여기저기서 직접 읽지 않습니다.
- `backend/.env.example` 을 `.env` 로 복사해 값을 채웁니다. `.env` 는 커밋하지 않고, 새 변수를 추가하면 `.env.example` 에도 설명과 함께 추가합니다.

### 8.5 네이밍 · 포맷

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 파일 | camelCase `.js`, `도메인 + 역할` | `memberService.js`, `commentRepository.js` |
| 팩토리 함수 | `createXxx` | `createMemberService` |
| 상수 | UPPER_SNAKE_CASE (단일 값), camelCase (객체) | `PASSWORD_PATTERN`, `agreementTypes` |
| DB 컬럼 / 테이블 | snake_case | `password_hash`, `post_application` |
| JS 객체 필드 / API 필드 | camelCase (Repository 에서 변환) | `passwordHash`, `createdAt` |

- 파일 첫 줄에 `'use strict';` 를 두고, `require` / `module.exports` 를 사용합니다.
- 들여쓰기·따옴표·세미콜론은 7절과 같습니다. 공개 함수 위에는 JSDoc(`/** … */`)으로 의도와 API 경로를 적습니다.
- DB 시간은 UTC 로 저장합니다 (`config/db.js` 에서 세션 시간대를 `+00:00` 으로 고정).

### 8.6 테스트

- Node 내장 `node:test` 를 사용하고 `test/<domain>/` 에 `xxx.test.js` 로 둡니다. `npm test` 로 실행합니다.
- DB 없이 실행되도록 가짜 repository 를 `createApp()` 에 주입해 API 단위로 검증합니다.
- 새 API 를 만들면 성공 응답과 주요 실패 코드(400·401·403·404·409)를 함께 테스트합니다.

## 9. Git 컨벤션

- 브랜치: `main` 은 직접 push 하지 않고 기능 브랜치에서 PR 로 병합합니다.
  - `feat/기능명`, `fix/버그명`, `refactor/…`, `docs/…`, `chore/…`
- 커밋 메시지: `타입: 요약` (한국어 가능)
  - `feat` 기능 추가 · `fix` 버그 수정 · `refactor` 리팩터링 · `style` 포맷/스타일 · `docs` 문서 · `test` 테스트 · `chore` 빌드/설정
  - 예) `feat: 공고 상세 신청자 승인 기능 추가`
- `.env` 등 비밀 정보는 커밋하지 않습니다 (`.env.example` 만 허용).

