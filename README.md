# OurParty

게임 파티원 모집 커뮤니티. 공고를 올리고, 질문(댓글)과 답변(답글)으로 소통하고, 답변을 **채택**하고, 파티가 끝나면 **매너 평가**를 남깁니다.
(멋쟁이사자처럼 백엔드 스쿨 11기 기본 프로젝트 2팀)

- 프로젝트 가이드·구조·명령어: [CLAUDE.md](./CLAUDE.md)
- 문서: [요구사항](./docs/02-requirements.md) · [DB 설계](./docs/03-db-design.md) · [ERD](./docs/04-erd.md) · [API 명세](./docs/API_SPEC.md) · [코딩 컨벤션](./docs/CODING_CONVENTION.md) · [시연 시나리오](./docs/demo-scenario.md)

## 환경

| 항목 | 버전 |
| --- | --- |
| Node.js | 26 (팀 기준 v26.13.1), npm 11 |
| DB | MySQL 8 |
| 프론트 | React 18 + Vite + TypeScript + Tailwind |
| 백엔드 | Express 5 (CommonJS) + mysql2 + JWT |

## 실행

```bash
# 1. DB (root 로 먼저 계정 생성 후 스키마·시드 적용)
mysql -u root -p < db/create-app-user.sql
mysql -u begg -p beggdb < db/schema.sql
mysql -u begg -p beggdb < db/seed.sql        # 기준 데이터 + 시연 데이터

# 2. 백엔드 (http://localhost:8080)
cd backend && cp .env.example .env           # DB 접속 정보 입력 (.env 는 커밋 금지)
npm install && npm run dev

# 3. 프론트 (http://localhost:5173)
cd frontend && npm install && npm run dev
```

시연용 계정(비밀번호 모두 `abc123!@`): `demohost`(공고 작성자) · `demoasker`(질문자) · `demohelper`(답변자)

## 팀 규칙

- 브랜치: `feat/…`, `fix/…`, `docs/…` 로 main 에서 분기, PR 로만 병합 (직접 push 금지)
- 커밋: `feat:` `fix:` `docs:` `refactor:` `test:` 접두사 + 한글 요약 ([CODING_CONVENTION.md](./docs/CODING_CONVENTION.md) 참고)
- PR: 담당자·마일스톤(`개발`) 지정, 스키마를 바꾸면 `db/migrations/*.sql` 과 `db/schema.sql`·docs 03·04 를 함께 수정하고 PR 본문에 팀원이 할 일을 적습니다
- 변경 후 `backend` 는 `npm test`, `frontend` 는 `npm run build` 와 `npm run lint` 통과 확인
