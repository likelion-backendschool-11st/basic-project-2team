# CLAUDE.md

이 파일은 Claude Code(및 팀원)가 이 저장소에서 작업할 때 참고하는 프로젝트 가이드입니다.
코드를 수정하기 전에 아래 문서들을 먼저 확인해 주세요.

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
- 백엔드는 아직 구현 전입니다. [API 정의서](./docs/API_SPEC.md)는 화면·데이터 모델을 기준으로 정리한 **초안**이며, 백엔드 구현 시 이 문서를 함께 갱신합니다.
- 화면 디자인은 Google Stitch 시안을 기반으로 합니다(각 data 파일 상단 주석에 Stitch 화면명/ID 표기).

---

## 2. 사양 (개발 환경)

### 프론트엔드 (`frontend/`)

| 항목 | 버전 / 내용 |
| --- | --- |
| 런타임 | Node.js 26 (팀 기준 v26.13.1), npm 11 |
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

## 3. 관련 문서

| 문서 | 내용 |
| --- | --- |
| [CODING_CONVENTION.md](./docs/CODING_CONVENTION.md) | 아키텍처 원칙, 라우팅, 네이밍, TypeScript·React·Tailwind 규칙, 포맷, Git 컨벤션 |
| [API_SPEC.md](./docs/API_SPEC.md) | 공통 규칙(응답 포맷·인증·페이지네이션·상태 코드)과 도메인별 API 엔드포인트 (초안) |
| [02-requirements.md](./docs/02-requirements.md) | 요구사항 명세 (Notion 「요구 사항 명세」 내보내기를 분류별 표로 정리) |
| [03-db-design.md](./docs/03-db-design.md) | MySQL 8 테이블 설계안 — 컬럼, 관계, 인덱스, 삭제 정책, 결정 사항 |
| [04-erd.md](./docs/04-erd.md) | 03 설계안을 옮긴 ERD (Mermaid) — 전체 관계도, 도메인별 상세 ERD, FK 목록과 삭제 동작 |
| [db/create-app-user.sql](./db/create-app-user.sql) | 로컬 DB `beggdb`와 전용 계정 `begg` 생성 (root로 먼저 실행) |
| [db/schema.sql](./db/schema.sql) | 04 ERD 기준 MySQL DDL — 테이블, FK, 인덱스, CHECK. 스키마를 바꾸면 03·04 문서도 함께 수정 |

---

## 4. Claude 작업 시 참고 사항

- 코드를 작성·수정하기 전에 [CODING_CONVENTION.md](./docs/CODING_CONVENTION.md) 를 읽고 규칙을 따릅니다.
- 새 기능을 만들 때 기존 같은 도메인의 `data/` → `hooks/` → `components/` → `pages/` 파일을 먼저 읽고 패턴을 맞춥니다.
- 목 데이터를 실제 API로 교체할 때는 [API_SPEC.md](./docs/API_SPEC.md) 를 기준으로 하고, `data/` 의 타입 정의를 API 응답 타입으로 재사용하며, 목 상수는 연동이 끝난 뒤 제거합니다.
- API 스펙을 바꾸면 [API_SPEC.md](./docs/API_SPEC.md) 도 함께 수정합니다.
- 변경 후 `frontend/` 에서 `npm run build` 와 `npm run lint` 를 실행해 확인합니다.
