# 코딩 컨벤션

OurParty 프론트엔드(`frontend/`)의 코딩 컨벤션입니다. 프로젝트 개요와 개발 환경은 [CLAUDE.md](../CLAUDE.md)를 참고하세요.

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
- 새 페이지 추가 시: `ROUTES`(필요하면 `paths`)에 등록 → `App.tsx`에 `<Route>` 추가.

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

## 8. Git 컨벤션

- 브랜치: `main` 은 직접 push 하지 않고 기능 브랜치에서 PR 로 병합합니다.
  - `feat/기능명`, `fix/버그명`, `refactor/…`, `docs/…`, `chore/…`
- 커밋 메시지: `타입: 요약` (한국어 가능)
  - `feat` 기능 추가 · `fix` 버그 수정 · `refactor` 리팩터링 · `style` 포맷/스타일 · `docs` 문서 · `test` 테스트 · `chore` 빌드/설정
  - 예) `feat: 공고 상세 신청자 승인 기능 추가`
- `.env` 등 비밀 정보는 커밋하지 않습니다 (`.env.example` 만 허용).

