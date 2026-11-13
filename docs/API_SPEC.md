# API 정의서

OurParty 서비스의 REST API 정의서입니다. 프로젝트 개요와 개발 환경은 [CLAUDE.md](../CLAUDE.md)를 참고하세요.
요구사항은 [요구사항 명세](./02-requirements.md), 테이블 설계는 [DB 설계안](./03-db-design.md)을 참고하세요.

> ⚠️ **초안** — 현재 프론트엔드 화면과 `src/data/*.ts` 의 데이터 모델을 기준으로 작성했습니다.
> 백엔드 구현 과정에서 변경되면 이 표와 프론트 타입을 함께 수정해 주세요.

## 1. 공통 규칙

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

// 실패 (입력 검증) — 필드별 오류가 있으면 fields 를 함께 보냄
{ "success": false, "error": { "code": "INVALID_INPUT", "message": "입력값을 확인해주세요.", "fields": [{ "field": "userId", "message": "..." }] } }
```

| HTTP 상태 | 의미 |
| --- | --- |
| 200 / 201 / 204 | 성공 / 생성됨 / 본문 없음 |
| 400 | 요청 값 검증 실패 |
| 401 | 인증 필요 / 토큰 만료 |
| 403 | 권한 없음 (작성자·관리자 아님, 정지 회원) |
| 404 | 리소스 없음 |
| 409 | 중복 (아이디/닉네임/이메일, 이미 신청함 등) |

## 2. 인증 · 회원 (Auth / Member)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 | |
| GET | `/api/auth/check?type={userId\|nickname\|email}&value=` | 중복 확인 → `{ available: boolean }` | |
| POST | `/api/auth/login` | 로그인 `{ userId, password, rememberMe }` → `{ accessToken, refreshToken, user }` | |
| POST | `/api/auth/logout` | 로그아웃 | 🔒 |
| POST | `/api/auth/refresh` | 토큰 재발급 | |
| POST | `/api/auth/find-id` | 아이디 찾기 `{ nickname, email }` → `{ userId }` | |
| POST | `/api/auth/find-password` | 비밀번호 찾기 `{ userId, email }` → `{ resetToken, expiresAt }` | |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 `{ resetToken, newPassword }` → `204` | |
| GET | `/api/members/me` | 내 계정 정보 (프로필 수정 화면 초기값) | 🔒 |
| PATCH | `/api/members/me` | 프로필 수정 (닉네임, 소개, 나이대·공개 여부, 선호 게임·대표 게임, 플레이 스타일) | 🔒 |
| PATCH | `/api/members/me/password` | 비밀번호 변경 `{ currentPassword, newPassword }` → `204` | 🔒 |
| DELETE | `/api/members/me` | 회원 탈퇴 `{ password, reason? }` → `204` | 🔒 |
| GET | `/api/members/{memberId}` | 다른 회원 프로필 (닉네임, 레벨, 매너 온도, 상위 태그) — 응답은 8절 | |

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

**회원가입 입력 규칙** (구현: `backend/src/member/memberValidator.js`)

| 필드 | 필수 | 규칙 | 저장 |
| --- | --- | --- | --- |
| `userId` | O | 영문 소문자·숫자 4~20자 | `member.login_id` |
| `nickname` | O | 공백 없이 2~10자 | `member.nickname` |
| `password` | O | 영문·숫자·특수문자(`!` `@` `#`)를 모두 포함한 8~12자. 다른 특수문자 불가 | `member.password_hash` (BCrypt) |
| `email` | O | 이메일 형식, 100자 이하. 소문자로 바꿔 저장 | `member.email` |
| `phone` | O | `010-1234-5678` 또는 `01012345678` | `member.phone` (하이픈 제거) |
| `name` | | 50자 이하, 비우면 `null` | `member.name` |
| `address` | | 받지만 **저장하지 않음** (DB에 컬럼 없음) | – |
| `agreements` | O | `terms`·`privacy` 는 `true` 필수, `marketing` 생략 시 `false`. 값은 boolean | `member_agreement` 3행 (TERMS / PRIVACY / MARKETING) |

**회원가입 응답** `201 Created`

```json
{ "success": true, "data": { "id": 1, "userId": "healer01", "nickname": "빛나는힐러" } }
```

**중복 확인 응답** `200 OK` — `type` 이 `userId|nickname|email` 이 아니거나, 값이 비었거나, 위 입력 규칙에 맞지 않으면 `400 INVALID_INPUT`

```json
{ "success": true, "data": { "available": false } }
```

**회원가입 · 중복 확인 에러 코드**

| 상태 | code | 상황 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | 입력 규칙 위반. `error.fields` 에 `[{ "field": "userId", "message": "..." }]` 형태로 필드별 오류를 모두 담음 |
| 400 | `INVALID_JSON` | 요청 본문이 JSON 형식이 아님 |
| 400 | `REQUIRED_TERMS_NOT_AGREED` | 필수 약관(`terms`, `privacy`) 미동의 |
| 403 | `REJOIN_RESTRICTED` | 탈퇴 후 재가입 제한 기간이 남은 휴대폰/이메일 (`member_withdrawal`) |
| 409 | `DUPLICATE_LOGIN_ID` · `DUPLICATE_NICKNAME` · `DUPLICATE_EMAIL` · `DUPLICATE_PHONE` | 이미 사용 중인 값 |

### 로그인 · 토큰 재발급 · 로그아웃

구현: `backend/src/member/memberService.js` (`login`, `refresh`, `logout`), 토큰: `backend/src/common/tokenProvider.js`, 인증 미들웨어: `backend/src/common/authMiddleware.js`

**토큰 정책** (값은 `backend/.env` 로 변경 가능)

| 항목 | 내용 |
| --- | --- |
| 공통 | 둘 다 JWT(HS256), 서명 키 `JWT_SECRET`. `sub` = 회원 id, `typ` = `access` / `refresh` 로 종류를 구분해 서로의 자리에 쓸 수 없음 |
| Access Token | 유효 시간 30분 (`ACCESS_TOKEN_TTL_SECONDS`). DB 에 저장하지 않음 |
| Refresh Token | `jti`(UUID) 포함. 폐기 처리를 위해 DB `refresh_token` 에 토큰의 SHA-256 해시를 저장하고, 재발급 시 JWT 검증과 DB 확인(폐기·만료)을 모두 통과해야 함. 유효 기간: `rememberMe=false` 1일 (`REFRESH_TOKEN_TTL_DAYS`), `true` 14일 (`REMEMBER_ME_TTL_DAYS`) |
| 재발급 | 사용한 Refresh Token 은 폐기하고 새로 발급(rotation). 만료 시각은 처음 로그인 때 값을 유지 |
| 로그아웃 | 해당 회원의 Refresh Token 을 모두 폐기 (`revoked_at` 기록) |
| 로그인 실패 잠금 | 5회 연속 실패 시 10분 잠금 (`member.login_fail_count`, `locked_until`). 로그인 성공 시 초기화 (REQ-LOGIN-006) |

**로그인 요청** `POST /api/auth/login`

```json
{ "userId": "healer01", "password": "********", "rememberMe": false }
```

- `userId`, `password` 는 필수(빈 값이면 `400 INVALID_INPUT`). 가입 규칙(패턴)은 검사하지 않음
- `rememberMe` 는 생략 시 `false`, boolean 이 아니면 `400 INVALID_INPUT`

**로그인 응답** `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "nickname": "빛나는힐러", "level": 48, "mannerTemp": 98.4, "avatarUrl": null, "online": true }
  }
}
```

**토큰 재발급** `POST /api/auth/refresh` — 요청 `{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }`

```json
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "새 토큰" } }
```

**로그아웃** 🔒 `POST /api/auth/logout` — `Authorization: Bearer {accessToken}` 필요, 본문 없음 → `204 No Content`

**로그인 · 토큰 에러 코드**

| 상태 | code | 상황 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | `userId`·`password` 누락, `rememberMe` 가 boolean 아님, `refreshToken` 누락 |
| 401 | `INVALID_CREDENTIALS` | 아이디가 없거나 비밀번호가 틀림 (둘을 구분하지 않음) |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh Token 이 위조·만료·폐기됐거나 Access Token 을 보냄 → 다시 로그인 |
| 401 | `UNAUTHORIZED` | 🔒 API 에 Access Token 이 없거나 위조됨 (Refresh Token 을 보낸 경우 포함) |
| 401 | `TOKEN_EXPIRED` | Access Token 만료 → `/api/auth/refresh` 로 재발급 후 재시도 |
| 403 | `ACCOUNT_LOCKED` | 로그인 5회 연속 실패로 잠김(5번째 실패 응답부터). 잠금 중에는 비밀번호가 맞아도 거부 |
| 403 | `ACCOUNT_SUSPENDED` | 이용 정지 기간 중 (`suspended_until` 이 지나면 로그인 허용) |
| 403 | `ACCOUNT_BANNED` | 영구 정지 |

> 정지·영구 정지 여부는 비밀번호가 맞을 때만 알려줍니다. 탈퇴 회원은 `login_id` 가 `NULL` 이라 `INVALID_CREDENTIALS` 로 응답합니다.

### 아이디/비밀번호 찾기

구현: `backend/src/member/memberService.js` (`findId`, `findPassword`, `resetPassword`)

**흐름** — 별도 인증(메일 발송 등) 없이, 가입 때 등록한 정보가 **일치하는지만** 확인합니다 (REQ-LOGIN-007, 외부 메일 API 미사용).

```
아이디 찾기    : find-id (닉네임 + 이메일 일치)
비밀번호 찾기  : find-password (아이디 + 이메일 일치) → reset-password
```

1. `POST /api/auth/find-id` `{ nickname, email }` → `{ userId }` — 닉네임·이메일이 모두 일치하는 회원의 아이디
2. `POST /api/auth/find-password` `{ userId, email }` → `{ resetToken, expiresAt }` — 아이디·이메일이 모두 일치하면 재설정 토큰(JWT `typ=password_reset`, 15분, 해시를 `password_reset_token` 에 저장)을 발급
3. `POST /api/auth/reset-password` `{ resetToken, newPassword }` → `204` — 새 비밀번호는 회원가입과 같은 규칙. 성공하면 로그인 실패 횟수·잠금을 초기화하고, 모든 Refresh Token 과 남은 재설정 토큰을 폐기합니다(다른 기기 로그아웃).

> 이메일은 앞뒤 공백을 지우고 소문자로 맞춰 비교합니다(가입 때와 같은 규칙).
> 프론트 비밀번호 찾기 화면은 "비밀번호 재설정" 버튼에서 2·3번을 차례로 호출하면 됩니다.

**응답 예시**

```json
// POST /api/auth/find-id
{ "success": true, "data": { "userId": "healer01" } }

// POST /api/auth/find-password
{ "success": true, "data": { "resetToken": "eyJ...", "expiresAt": "2026-11-13T00:15:00.000Z" } }
```

**아이디/비밀번호 찾기 에러 코드**

| 상태 | code | 상황 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | 필수값 누락, 이메일 형식, 새 비밀번호 규칙 위반 (`fields` 에 `newPassword` 등) |
| 401 | `INVALID_RESET_TOKEN` | 재설정 토큰이 만료·위조됐거나 이미 사용됨 → 처음부터 다시 |
| 404 | `MEMBER_NOT_FOUND` | 닉네임+이메일(아이디 찾기) 또는 아이디+이메일(비밀번호 찾기)이 일치하는 회원 없음 |

### 내 계정 관리 (내 정보 · 프로필 수정 · 비밀번호 변경 · 회원 탈퇴)

구현: `backend/src/account/` (`/api/members` 에 마운트). 모든 API 는 🔒 이며, 토큰이 유효해도 탈퇴한 회원이면 401 `UNAUTHORIZED` 입니다.

**내 정보 (`GET /api/members/me`)** — `PATCH /api/members/me` 도 수정 후 같은 형식으로 응답합니다.

```json
{
  "id": 1,
  "userId": "healer01",
  "nickname": "빛나는힐러",
  "email": "healer@example.com",
  "phone": "01012345678",
  "name": null,
  "bio": "멘탈 강한 힐러입니다.",
  "ageRange": "20대",
  "ageRangePublic": true,
  "avatarUrl": null,
  "level": 48,
  "mannerTemp": 98.4,
  "games": [{ "code": "lostark", "name": "로스트아크", "isMain": true, "playStyle": "casual" }],
  "createdAt": "2026-10-01T00:00:00.000Z"
}
```

**프로필 수정 (`PATCH /api/members/me`)** — 보낸 항목만 바꿉니다.

```json
{ "nickname": "새닉네임", "bio": "소개", "ageRange": "20대", "ageRangePublic": false,
  "games": ["lostark", "valorant"], "mainGame": "lostark", "playStyle": "casual" }
```

| 필드 | 규칙 |
| --- | --- |
| `nickname` | 회원가입과 같은 규칙(공백 없이 2~10자). 지금 닉네임 그대로면 변경 없음, 다른 회원이 쓰면 409 `DUPLICATE_NICKNAME` |
| `bio` | 200자 이하. `null` 또는 빈 문자열이면 지움 |
| `ageRange` · `ageRangePublic` | 10자 이하 문자열(`null` 이면 지움) · boolean. 비공개면 다른 사람 프로필에 나이대가 보이지 않음 |
| `games` | 활성 게임 코드 배열(최대 10개, 중복 제거). 보내면 게이머 프로필 전체를 이 목록으로 교체하고(빈 배열이면 모두 삭제), 남는 게임의 캐릭터 정보는 유지. 없는 코드는 400(`games`) |
| `mainGame` | `games` 중 하나. 생략하면 첫 번째 게임 |
| `playStyle` | `hard` · `casual` · `newbie` · `any` (공고와 같은 값) 또는 `null`. 선호 게임 전체에 적용 |

- `mainGame`·`playStyle` 은 `games` 와 함께 보내야 합니다(없으면 400 `games`).
- 이메일·휴대폰 번호·아바타 변경은 이번 범위에 없습니다.

**비밀번호 변경 (`PATCH /api/members/me/password`)** → `204`

- 새 비밀번호는 회원가입과 같은 규칙입니다. 성공하면 로그인 실패 횟수·잠금을 초기화하고 **모든 Refresh Token 을 폐기**하므로, 프론트는 안내 후 다시 로그인하게 합니다.

**회원 탈퇴 (`DELETE /api/members/me`)** `{ "password": "...", "reason": "선택, 200자 이하" }` → `204`

- 진행 중인 파티(내가 파티장인 `OPEN`·`CLOSED` 공고, 또는 `ACCEPTED` 로 참여 중인 `OPEN`·`CLOSED` 공고)가 있으면 409 `ACTIVE_PARTY_EXISTS` (REQ-WITHDRAW-002).
- 처리 (한 트랜잭션, docs/03-db-design.md 5절 삭제 정책)
  - `member`: `status = WITHDRAWN`, 아이디·닉네임·이메일·휴대폰·이름·비밀번호·소개·나이대·아바타를 `NULL` 로 비움. 공고·댓글·리뷰는 남고 "탈퇴한 회원"으로 표시
  - `member_withdrawal`: 휴대폰·이메일의 SHA-256 해시, 사유, 재가입 제한, 파기 예정일 보관. 제재 이력 없음 → 제한 없음·30일 뒤 파기 / 경고·기간 정지 이력 → 6개월 재가입 제한 / 영구 정지 이력 → 영구 제한 (6절 결정 사항 10·11)
  - 대기 중(`PENDING`) 신청은 `CANCELED`, 게이머 프로필·즐겨찾기(양방향)·스크랩·임시저장·알림 설정 삭제, 모든 Refresh Token·재설정 토큰 폐기

**내 계정 관리 에러 코드**

| 상태 | code | 상황 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | 입력 규칙 위반 (`fields` 에 필드별 오류) |
| 400 | `INVALID_PASSWORD` | 비밀번호 변경의 현재 비밀번호, 탈퇴의 비밀번호가 틀림 |
| 400 | `SAME_PASSWORD` | 새 비밀번호가 지금 비밀번호와 같음 |
| 401 | `UNAUTHORIZED` · `TOKEN_EXPIRED` | 토큰 없음·만료, 탈퇴한 회원 |
| 409 | `DUPLICATE_NICKNAME` | 다른 회원이 쓰는 닉네임 |
| 409 | `ACTIVE_PARTY_EXISTS` | 진행 중인 파티가 있어 탈퇴 불가 |

## 3. 공고 (Post)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts?category=&sort=&tags=&page=&size=` | 공고 목록 | |
| GET | `/api/posts/search?q=&tags=&page=&size=` | 공고 검색 | |
| GET | `/api/posts/popular?category=&limit=` | 인기 공고 (메인) | |
| GET | `/api/posts/urgent?category=&limit=` | 마감 임박 공고 (메인) | |
| GET | `/api/posts/{postId}` | 공고 상세 (조회수 +1) | |
| GET | `/api/posts/{postId}/related` | 관련 공고 | |
| POST | `/api/posts` | 공고 작성 | 🔒 |
| PUT | `/api/posts/{postId}` | 공고 수정 | 🔒 작성자 |
| DELETE | `/api/posts/{postId}` | 공고 삭제 | 🔒 작성자 |
| PATCH | `/api/posts/{postId}/status` | 모집 상태 변경 `{ status: "OPEN" \| "CLOSED" \| "COMPLETED" }` | 🔒 작성자 |
| POST | `/api/posts/drafts` | 임시저장 | 🔒 |
| GET | `/api/posts/drafts/latest` | 임시저장 불러오기 | 🔒 |
| POST / DELETE | `/api/posts/{postId}/scrap` | 스크랩 / 취소 | 🔒 |
| GET | `/api/games` | 게임 목록 + 게임별 상세 분류 `[{ code, name, categoryCode, contents: [{ code, name, type, maxHeadcount }] }]` (공고 작성 폼용) | |
| GET | `/api/categories` | 카테고리 목록 + 공고 수 | |

- `category`: `mmorpg` · `fps` · `aos` · `steam` · `etc` (생략 시 전체)
- `sort`: `recent`(기본) · `views` · `urgent`
- `q`: 검색어(50자 이하). 제목 · 파티명 · 게임명 · 태그 중 하나라도 포함하는 공고만 조회합니다 (`%`·`_` 는 문자 그대로 검색).
- `tags`: 쉼표로 구분한 태그(최대 5개, `#` 는 있어도 됨). 지정한 태그를 **모두** 가진 공고만 조회합니다.
- `page`(기본 1) · `size`(기본 8, 최대 50), `excludeClosed=true` 이면 모집 중(`OPEN`) 공고만 조회합니다 (기본 `false`).
- `urgent`: 출발 시간이 가까운 순(일정 미정은 뒤), 남은 자리가 적은 순입니다. `recent` 는 최신순, `views` 는 조회수순입니다.
- **인기·마감 임박** (`GET /api/posts/popular`, `GET /api/posts/urgent`): 응답은 목록 아이템(위 `GET /api/posts` 의 `items[]`)과 같은 모양의 **배열**입니다. `category`(생략 시 전체), `limit`(기본 4, 1~20, 그 밖은 400 `INVALID_INPUT`). 둘 다 **모집 중(`OPEN`)이고 아직 출발하지 않은**(일정 미정 포함) 공고만 대상입니다.
  - `popular`: 조회수 → 댓글 수 순
  - `urgent`: 남은 자리가 2 이하이거나 출발이 24시간 이내인 공고를 출발이 가까운 순(일정 미정은 뒤) → 남은 자리가 적은 순으로 정렬 (기준은 `boardConstants.js` 의 `URGENT_*`)
- **관련 공고** (`GET /api/posts/{postId}/related?limit=`): 응답은 목록 아이템(`GET /api/posts` 의 `items[]`)과 같은 모양의 **배열**이며 비로그인도 쓸 수 있고 **조회수는 올리지 않습니다**. 기준 공고와 **같은 게임**의, 모집 중(`OPEN`)이고 아직 출발하지 않은(일정 미정 포함) **다른 공고**를 같은 상세 분류 → 겹치는 태그가 많은 순 → 최신순으로 돌려줍니다. `limit` 기본 4, 1~20(그 밖은 400 `INVALID_INPUT`). 없으면 빈 배열, 기준 공고가 없거나 삭제됐거나 `postId` 형식이 틀리면 404 `POST_NOT_FOUND`.
- **공고 수정** (`PUT /api/posts/{postId}`) 🔒 작성자(일정·게임·상세 분류가 바뀌면 신청자에게 알림 — 알림 전송 표 참고): 요청 본문은 공고 작성(`POST /api/posts`)과 같고 모든 필드를 다시 보냅니다(태그는 보낸 것으로 교체). 응답 `200 { id }`. 작성과 같은 규칙으로 검증하되, **기존 일정을 그대로 보내면 이미 지난 일정이어도 허용**하고 새로 지정하는 과거 일정은 400 입니다. 모집 인원은 파티장 포함 **확정 인원보다 줄일 수 없고**(400 `INVALID_INPUT`, `fields[headcount]`), 모집 중인 공고의 인원을 확정 인원과 같게 줄이면 `CLOSED` 로 바뀝니다. 마감(`CLOSED`) 공고는 수정할 수 있고 상태는 그대로이며, 모집 중으로 되돌리려면 `PATCH .../status` 를 씁니다. 오류: 401 `UNAUTHORIZED`, 403 `NOT_POST_AUTHOR`, 404 `POST_NOT_FOUND`(없음·삭제됨·`postId` 형식 오류) · `GAME_NOT_FOUND` · `GAME_CONTENT_NOT_FOUND`, 409 `POST_NOT_EDITABLE`(완료된 공고).
- **스크랩** (`POST /api/posts/{postId}/scrap`, `DELETE /api/posts/{postId}/scrap`) 🔒: 둘 다 응답 `204` 이고 **멱등**입니다(이미 스크랩했거나 스크랩하지 않았어도 성공). 내 스크랩만 다루며 내 공고도 스크랩할 수 있습니다. 상세(`GET /api/posts/{postId}`)의 `viewer.scrapped` 에 반영됩니다. 오류: 401 `UNAUTHORIZED`, 404 `POST_NOT_FOUND`(없음·삭제됨·`postId` 형식 오류). 공고가 삭제되면 그 공고의 스크랩도 함께 지워집니다.
- **공고 삭제** (`DELETE /api/posts/{postId}`) 🔒 작성자: 응답 `204`. 소프트 삭제(`status = DELETED`, `deleted_at`)라 신청·댓글·리뷰는 보존하고, 그 공고의 스크랩은 삭제합니다. 삭제된 공고는 목록·상세·카테고리 공고 수에서 빠지고, 대기 중·수락된 신청자에게 알림을 보냅니다. 오류: 401 `UNAUTHORIZED`, 403 `NOT_POST_AUTHOR`, 404 `POST_NOT_FOUND`(없음, 이미 삭제됨, `postId` 가 1 이상의 정수가 아님). 활동 점수 회수(`POST_REVOKE`)는 점수 지급이 구현될 때 함께 합니다.
- **모집 상태 변경** (`PATCH /api/posts/{postId}/status`) 🔒 작성자: 규칙·응답·오류는 4절 「모집 상태 변경」을 보세요(`backend/src/party`).
- **임시저장** (`POST /api/posts/drafts`, `GET /api/posts/drafts/latest`): 회원당 1개이며 새로 저장하면 덮어씁니다. 요청 본문은 작성 폼 값 `{ title, body, partyName, game, type, detail, headcount, style, tbd, date, time, voice }` 중 보낸 것만 저장하고(미완성·빈 값 허용, 알 수 없는 필드는 버림), 타입이 틀리거나 너무 긴 값은 400 `INVALID_INPUT`(필드별) 입니다. 두 API 모두 `{ draft, savedAt }` 를 돌려주며, 저장한 적이 없으면 `GET` 은 `data: null` 입니다. 공고를 등록하면 그 회원의 임시저장은 삭제됩니다.
- `GET /api/categories` 는 `[{ code, name, postCount }]` 를 `sort_order` 순으로 돌려줍니다. `postCount` 는 삭제되지 않은 공고 수(마감 포함)입니다.
- 삭제된 공고는 목록에 나오지 않습니다. 응답은 `{ items, page, size, totalCount, totalPages }` 이고, 값이 올바르지 않으면 400 `INVALID_INPUT`(필드별) 입니다.

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

- 응답 `201 { id }`. `title` 2~100자, `body` 필수(마크다운, 10000자 이하), `headcount` 2~16, `type` = `raid`·`dungeon`·`rank`·`normal` (게임의 상세 분류 `contents[].type` 과 같은 값), `style` = `hard`·`casual`·`newbie`·`any`(선택), `tags` 최대 5개(각 20자 이하, 공백 없음).
- `schedule` 은 시간대(offset)를 포함한 ISO-8601 이며 현재 이후여야 합니다. `scheduleTbd: true` 이면 `schedule` 은 무시하고 NULL 로 저장합니다.
- 오류: 400 `INVALID_INPUT`(필드별), 401 `UNAUTHORIZED`, 404 `GAME_NOT_FOUND`·`GAME_CONTENT_NOT_FOUND`. `detail` 의 type 이 요청 `type` 과 다르거나 `headcount` 가 그 상세 분류의 `maxHeadcount` 를 넘으면 400(`detail`·`headcount` 필드 오류).

**공고 상세 (`GET /api/posts/{postId}`)**

- 로그인 없이 조회할 수 있습니다. `Authorization` 헤더를 보내면 `viewer` 에 로그인한 사용자 기준 정보가 담기고, 헤더가 있는데 토큰이 틀리거나 만료됐으면 401 (`UNAUTHORIZED` · `TOKEN_EXPIRED`) 입니다.
- 호출할 때마다 조회수가 1 오르며, 응답 `views` 는 오른 뒤의 값입니다.
- 필드 이름은 공고 작성 요청과 같습니다 (`game`·`detail` 은 코드, 이름은 `gameName`·`detailName`). `current` 는 파티장을 포함한 현재 인원입니다.
- 확정 파티원 목록은 `GET /api/posts/{postId}/participants`, 관련 공고는 `GET /api/posts/{postId}/related` 로 따로 조회합니다.
- 오류: 404 `POST_NOT_FOUND` (없음, 삭제됨, `postId` 가 1 이상의 정수가 아님), 401 (잘못된 토큰).

```json
{
  "id": 7,
  "category": "mmorpg", "categoryName": "MMORPG",
  "game": "lostark", "gameName": "로스트아크",
  "detail": "kamen", "detailName": "카멘", "detailType": "RAID",
  "type": "raid",
  "title": "[카멘 1-3관] 1620+ 숙련 랏서폿 1분 모십니다",
  "body": "마크다운 본문",
  "partyName": "카멘 하드 숙련팟",
  "style": "hard",
  "requiredSpec": null,
  "headcount": 8, "current": 7,
  "schedule": "2026-11-15T12:00:00.000Z", "scheduleTbd": false,
  "voiceRequired": true,
  "status": "OPEN",
  "views": 129, "commentCount": 3,
  "tags": ["숙련", "디코필수"],
  "host": { "id": 3, "nickname": "빛나는오더", "avatarUrl": null, "level": 52, "mannerTemp": 99.8, "reviewCount": 184 },
  "viewer": { "isOwner": false, "scrapped": true, "applicationStatus": "PENDING" },
  "createdAt": "2026-11-12T11:30:00.000Z",
  "updatedAt": "2026-11-12T11:30:00.000Z"
}
```

- `detail`·`detailName`·`detailType`·`partyName`·`style`·`requiredSpec` 은 없으면 `null`. 일정 미정이면 `schedule: null`, `scheduleTbd: true`.
- `viewer` 는 비로그인이면 `null`. `applicationStatus` 는 신청한 적이 없으면 `null`, 아니면 `PENDING`·`ACCEPTED`·`REJECTED`·`CANCELED`·`NO_SHOW`.
- 탈퇴한 작성자는 `host.nickname` 이 `"탈퇴한 회원"`, `avatarUrl` 이 `null` 입니다.

**공고 목록 아이템 (`BoardPost`)**

```json
{
  "id": 7, "category": "mmorpg", "game": "lostark", "gameName": "로스트아크", "type": "raid",
  "title": "...", "current": 3, "max": 8, "tags": ["숙련"],
  "author": "빛나는오더",
  "schedule": "2026-11-15T12:00:00.000Z", "scheduleTbd": false, "voiceRequired": true,
  "views": 128, "commentCount": 3, "status": "OPEN",
  "createdAt": "2026-11-12T11:30:00.000Z"
}
```

- `current` / `max` 는 파티장 포함 현재 인원 / 정원입니다. 탈퇴한 작성자는 `author` 가 `"탈퇴한 회원"` 입니다. 일정 미정이면 `schedule: null`, `scheduleTbd: true` 입니다.

## 4. 파티 참가 (Application)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/posts/{postId}/applications` | 참가 신청 `{ role, message }` | 🔒 |
| DELETE | `/api/posts/{postId}/applications/me` | 신청 취소 | 🔒 |
| GET | `/api/posts/{postId}/applications` | 신청자 목록 | 🔒 작성자 |
| PATCH | `/api/posts/{postId}/applications/{applicationId}` | 승인/거절 `{ status: "ACCEPTED" \| "REJECTED" }` | 🔒 작성자 |
| GET | `/api/posts/{postId}/participants` | 확정 파티원 목록 (`Participant[]`) | |

구현: `backend/src/party/` (`/api/posts` 에 마운트). 모두 🔒 이며 `participants` 만 비로그인도 조회할 수 있습니다. `postId`·`applicationId` 가 1 이상의 정수가 아니거나 삭제된 공고면 404 입니다.

**참가 신청 (`POST /api/posts/{postId}/applications`)** — 본문 `{ "role": "서포터", "message": "잘 부탁드려요" }` (둘 다 선택, `role` 30자·`message` 200자 이하) → `201` `{ "id": 3, "status": "PENDING" }`

- 취소(`CANCELED`)했던 신청은 같은 행을 `PENDING` 으로 되살립니다. 이때 `late_cancel` · `canceled_at` 취소 기록은 지우지 않습니다. 거절(`REJECTED`)·노쇼(`NO_SHOW`)된 신청은 다시 할 수 없습니다.
- 오류: 400 `INVALID_INPUT`(필드별), 401 `UNAUTHORIZED`, 403 `CANNOT_APPLY_OWN_POST` · `REAPPLY_NOT_ALLOWED` · `ACCOUNT_BANNED` · `ACCOUNT_SUSPENDED`, 404 `POST_NOT_FOUND`, 409 `POST_CLOSED`(`OPEN` 이 아님) · `PARTY_FULL`(정원이 참) · `ALREADY_APPLIED`(대기 중·수락됨).

**신청 취소 (`DELETE /api/posts/{postId}/applications/me`)** → `204`

- 대기 중(`PENDING`)·수락(`ACCEPTED`)된 내 신청만 취소할 수 있습니다. 수락된 신청이면 공고의 `current` 가 1 줄고, 출발 3시간 이내(이미 지난 경우 포함)면 `late_cancel` 로 기록해 노쇼와 구분합니다.
- 오류: 404 `POST_NOT_FOUND` · `APPLICATION_NOT_FOUND`(취소할 신청이 없음), 409 `POST_COMPLETED`.

**신청자 목록 (`GET /api/posts/{postId}/applications?status=`)** 🔒 작성자 — 취소·노쇼는 제외하고 오래된 순입니다. `status` 는 `PENDING` · `ACCEPTED` · `REJECTED`.

```json
[{ "id": 3, "status": "PENDING", "role": "서포터", "message": "잘 부탁드려요", "appliedAt": "2026-11-12T00:00:00.000Z",
   "applicant": { "id": 2, "nickname": "빛나는오더", "avatarUrl": null, "level": 52, "mannerTemp": 99.8, "reviewCount": 184 } }]
```

- 탈퇴한 신청자의 `nickname` 은 `"탈퇴한 회원"` 입니다. 오류: 400 `INVALID_INPUT`, 403 `NOT_POST_AUTHOR`.

**승인/거절 (`PATCH /api/posts/{postId}/applications/{applicationId}`)** 🔒 작성자 — 본문 `{ "status": "ACCEPTED" | "REJECTED" }` → `200` `{ "id": 3, "status": "ACCEPTED", "current": 2, "max": 8, "postStatus": "OPEN" }`

- 대기 중 신청만 처리합니다. 승인하면 `current` 가 1 늘고(정원을 넘지 않게 공고 행을 잠금), 거절은 인원을 바꾸지 않습니다. 마지막 자리를 승인해 정원이 차면 공고 `status` 가 `CLOSED` 로 바뀌고(`postStatus`), 정원이 찬 마감 공고에서 수락된 사람이 취소하면 다시 `OPEN` 이 됩니다(작성자가 직접 마감한 공고는 자리가 나도 그대로).
- 오류: 400 `INVALID_INPUT`, 403 `NOT_POST_AUTHOR`, 404 `APPLICATION_NOT_FOUND`, 409 `ALREADY_DECIDED` · `PARTY_FULL`(승인만) · `POST_CLOSED`(승인만, 작성자가 마감하거나 완료한 공고).

**모집 상태 변경 (`PATCH /api/posts/{postId}/status`)** 🔒 작성자 — 본문 `{ "status": "OPEN" | "CLOSED" | "COMPLETED" }` → `200` `{ "id": 7, "status": "CLOSED", "current": 3, "max": 8 }`

- `OPEN` ↔ `CLOSED`(직접 마감·재개)와 `COMPLETED`(진행 완료)로 바꿉니다. 같은 상태로 요청하면 그대로 `200` 입니다.
- `COMPLETED` 는 승인된 파티원(탈퇴 회원 제외)이 있고 출발 시간이 지난 뒤에만 가능합니다(일정 미정이면 시간 조건 없음). 완료하면 되돌릴 수 없습니다.
- 완료하면 같은 트랜잭션에서 파티장과 승인된 파티원에게 활동 점수 `PARTY_COMPLETE` +20 을 지급하고(결정 사항 8-1) 이후 파티원끼리 별점 평가(7절)를 할 수 있습니다. 같은 상태로 다시 요청해도 점수는 한 번만 지급됩니다. 정원이 찬 공고는 `OPEN` 으로 다시 열 수 없습니다.
- 오류: 400 `INVALID_INPUT`, 401, 403 `NOT_POST_AUTHOR`, 404 `POST_NOT_FOUND`, 409 `POST_COMPLETED` · `PARTY_FULL` · `COMPLETE_NOT_ALLOWED`(파티원이 없거나 출발 전).
- ⚠️ 출발 시간이 지나면 종료 처리(REQ-POST-007 후반)는 스케줄러가 필요해 아직 없습니다.

**확정 파티원 (`GET /api/posts/{postId}/participants`)** — 파티장이 먼저, 이어서 수락된 순입니다.

```json
[{ "id": 1, "nickname": "빛나는오더", "avatarUrl": null, "level": 52, "mannerTemp": 99.8, "reviewCount": 184, "role": null, "isHost": true },
 { "id": 2, "nickname": "달빛힐러", "avatarUrl": null, "level": 3, "mannerTemp": 36.5, "reviewCount": 0, "role": "서포터", "isHost": false }]
```

**알림 전송** — 아래 파티 이벤트가 일어나면 같은 트랜잭션 안에서 `notification` 에 한 건씩 저장합니다(이벤트가 실패해 롤백되면 알림도 남지 않음). 문구는 `partyConstants.js` 의 `partyMessages.notice`, 공고 제목은 40자에서 줄임표로 자릅니다.

| 이벤트 | 받는 사람 | `type` |
| --- | --- | --- |
| 참가 신청 · 재신청 | 파티장 | `APPLICATION_RECEIVED` |
| 신청 승인/거절 | 신청자 | `APPLICATION_RESULT` |
| 수락된 파티원의 신청 취소 (대기 중 취소는 알리지 않음) | 파티장 | `APPLICATION_CANCELED` |
| 승인으로 정원이 차서 자동 마감 | 아직 대기 중인 신청자 | `POST_UPDATED` |
| 작성자가 마감(`CLOSED`)·완료(`COMPLETED`) 처리 (재개는 알리지 않음) | 대기 중·수락된 신청자 | `POST_UPDATED` |
| 작성자가 공고 수정(`PUT`)에서 **일정 · 게임 · 상세 분류를 바꿈** (제목·본문·태그만 고치면 알리지 않음) | 대기 중·수락된 신청자 | `POST_UPDATED` |
| 작성자가 공고 삭제(`DELETE`) | 대기 중·수락된 신청자 | `POST_DELETED` (공고가 사라지므로 `postId` 는 `null`) |

### 알림함 (Notification)

구현: `backend/src/notification/` (`/api/notifications` 에 마운트). 모두 🔒 이며 **내 알림만** 다룹니다(관리자가 보낸 `SANCTION` · `POST_DELETED` 포함). 실시간 푸시 없이 프론트가 폴링합니다.

| Method | URI | 설명 |
| --- | --- | --- |
| GET | `/api/notifications?page=&size=&unread=` | 내 알림 목록(최신순). `size` 기본 20 · 최대 50, `unread=true` 면 안 읽은 알림만 |
| GET | `/api/notifications/unread-count` | 안 읽은 알림 수 `{ count }` (헤더 배지 폴링용) |
| PATCH | `/api/notifications/{notificationId}/read` | 알림 하나를 읽음 처리 → `204` (이미 읽은 알림도 `204`) |
| PATCH | `/api/notifications/read-all` | 내 안 읽은 알림을 모두 읽음 처리 → `204` |

```json
{
  "items": [{ "id": 12, "type": "APPLICATION_RESULT", "message": "'카멘 하드 숙련팟' 공고 참가 신청이 수락되었습니다.", "postId": 7, "read": false, "createdAt": "2026-11-13T05:00:00.000Z" }],
  "page": 1, "size": 20, "totalCount": 1, "totalPages": 1, "unreadCount": 1
}
```

- `postId` 는 연결된 공고가 없거나 공고가 삭제돼 연결이 끊어지면 `null` 입니다. `unreadCount` 는 `unread` 필터와 상관없이 내 전체 안 읽은 알림 수입니다.
- 오류: 400 `INVALID_INPUT`(`page` · `size` · `unread`), 401 `UNAUTHORIZED`, 404 `NOTIFICATION_NOT_FOUND`(없음, 남의 알림, 형식이 틀린 id — 남의 알림은 존재 여부를 알리지 않으려고 404).

## 5. 댓글 (Comment)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts/{postId}/comments?sort=oldest\|newest&page=&size=4` | 댓글 목록 (루트 댓글 기준 페이징, 대댓글 포함) | |
| POST | `/api/posts/{postId}/comments` | 댓글/대댓글 작성 `{ text, parentId?, secret }` | 🔒 |
| PATCH | `/api/comments/{commentId}` | 댓글 수정 `{ text }` | 🔒 작성자 |
| DELETE | `/api/comments/{commentId}` | 댓글 삭제 (대댓글 함께 삭제) | 🔒 작성자 |

- 비밀 댓글은 댓글 작성자와 공고 작성자에게만 본문을 노출합니다. 대댓글이면 부모 댓글 작성자에게도 노출합니다.

**댓글 목록 (`GET /api/posts/{postId}/comments`)**

- 로그인 없이 조회할 수 있습니다. `Authorization` 헤더를 보내면 `mine` 과 비밀 댓글 본문이 로그인한 사용자 기준으로 채워집니다 (토큰이 틀리면 401).
- `sort`: `oldest`(기본, 등록순) · `newest`(최신순). 루트 댓글에만 적용되고 `replies` 는 항상 등록순입니다.
- 페이징은 루트 댓글 기준입니다. `size` 기본 4, 최대 50. `totalCount` 는 루트 댓글 수입니다 (대댓글 포함 전체 수는 공고 상세의 `commentCount`).
- 삭제된 댓글(`DELETED`)은 빠지고, 루트 댓글이 삭제되면 그 대댓글도 함께 빠집니다. 관리자가 가린 댓글(`HIDDEN`)은 `hidden: true` 로 내려주며 프론트에서 [펼쳐보기] 뒤에 보여줍니다.
- 오류: 400 `INVALID_INPUT`(sort·page·size), 404 `POST_NOT_FOUND`.

```json
{
  "items": [
    {
      "id": 12, "parentId": null,
      "author": { "id": 9, "nickname": "홀리한빛", "avatarUrl": null },
      "isPostAuthor": false, "mine": false,
      "text": "극신속 홀나 1625입니다. 스펙 확인 부탁드려요!",
      "secret": false, "hidden": false, "reported": false,
      "createdAt": "2026-11-12T11:40:00.000Z",
      "replies": [
        {
          "id": 13, "parentId": 12,
          "author": { "id": 3, "nickname": "빛나는오더", "avatarUrl": null },
          "isPostAuthor": true, "mine": true,
          "text": null, "secret": true, "hidden": false, "reported": false,
          "createdAt": "2026-11-12T11:45:00.000Z"
        }
      ]
    }
  ],
  "page": 1, "size": 4, "totalCount": 6, "totalPages": 2
}
```

- `text` 는 비밀 댓글을 볼 수 없는 사용자에게 `null` 입니다. 탈퇴한 작성자는 `author.nickname` 이 `"탈퇴한 회원"`, `avatarUrl` 이 `null` 입니다.
- `isPostAuthor`: 공고 작성자가 쓴 댓글 (화면의 "작성자" 배지), `mine`: 로그인한 사용자가 쓴 댓글 ("내 댓글" 배지, 비로그인이면 항상 `false`).
- `reported`: 로그인한 사용자가 이미 신고한 댓글 ("신고됨" 표시, 비로그인이면 항상 `false`).
- 댓글 작성자 프로필(팝오버)은 `author.id` 로 `GET /api/members/{memberId}` (8절) 를 호출합니다.

**댓글 · 대댓글 작성 (`POST /api/posts/{postId}/comments`)** 🔒

```json
{ "text": "디코 채널 링크 알려주시면 바로 들어가겠습니다.", "parentId": 12, "secret": false }
```

- `text` 필수(앞뒤 공백 제거 후 1~500자), `secret` 선택(boolean, 기본 `false`), `parentId` 선택 — 넣으면 그 댓글의 대댓글이 됩니다.
- 대댓글은 1단계까지입니다. `parentId` 는 같은 공고의 삭제되지 않은 루트 댓글이어야 합니다.
- 응답 `201` — 작성된 댓글 (목록 아이템과 같은 형식, `replies` 없음). 공고의 `commentCount` 가 1 오릅니다.
- 오류: 400 `INVALID_INPUT`(필드별) · `REPLY_DEPTH_EXCEEDED`(대댓글에 답글), 401 `UNAUTHORIZED`, 403 `ACCOUNT_SUSPENDED` · `ACCOUNT_BANNED`, 404 `POST_NOT_FOUND` · `COMMENT_NOT_FOUND`(부모 댓글 없음).

**댓글 수정 (`PATCH /api/comments/{commentId}`)** 🔒 작성자

- 요청 `{ "text": "고친 내용" }` — 작성 규칙과 같음(1~500자). 응답 `200` — 수정된 댓글 (목록 아이템 형식, `replies` 없음).
- 공고 작성자라도 다른 사람의 댓글은 고칠 수 없습니다. 관리자가 가린(`HIDDEN`) 댓글은 고칠 수 없습니다.
- 오류: 400 `INVALID_INPUT`, 401 `UNAUTHORIZED`, 403 `NOT_COMMENT_AUTHOR` · `COMMENT_HIDDEN` · `ACCOUNT_SUSPENDED` · `ACCOUNT_BANNED`, 404 `COMMENT_NOT_FOUND`(없음, 삭제됨, 공고 삭제됨).

**댓글 삭제 (`DELETE /api/comments/{commentId}`)** 🔒 작성자

- 응답 `204`. 소프트 삭제(`status = DELETED`, `deleted_at`)이며, 루트 댓글이면 대댓글도 함께 삭제됩니다. 삭제된 수만큼 공고의 `commentCount` 가 줄어듭니다.
- 오류: 401 `UNAUTHORIZED`, 403 `NOT_COMMENT_AUTHOR`, 404 `COMMENT_NOT_FOUND`(없음, 이미 삭제됨).

## 6. 신고 (Report)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/reports` | 신고 `{ targetType: "USER"\|"NO_SHOW"\|"POST"\|"COMMENT", targetId, reason, detail? }` | 🔒 |

- `reason`: `욕설 및 비하 발언` · `스팸 / 도배` · `부적절한 광고` · `개인정보 노출` · `기타`
- ⚠️ 현재 구현은 **`COMMENT` 신고만** 받습니다. 다른 `targetType` 은 400 `INVALID_INPUT` 입니다 (USER · NO_SHOW · POST 는 추후 구현).

**댓글 신고**

```json
{ "targetType": "COMMENT", "targetId": 12, "reason": "욕설 및 비하 발언", "detail": "반복적인 욕설" }
```

- 응답 `201 { id }`. `reason` 은 위 문구 그대로 `report.reason_code` 에 저장합니다 (관리자 신고 목록에 그대로 표시). `detail` 선택, 500자 이하.
- 같은 사람이 같은 댓글을 두 번 신고할 수 없고(409), 본인 댓글은 신고할 수 없습니다(400).
- 신고하면 댓글의 `report_count` 가 1 오르고, 서로 다른 신고자가 5명 이상이 되면 댓글이 `HIDDEN` 으로 자동 가려집니다 (REQ-REPORT-004).
- 오류: 400 `INVALID_INPUT` · `CANNOT_REPORT_SELF`, 401 `UNAUTHORIZED`, 404 `COMMENT_NOT_FOUND`, 409 `ALREADY_REPORTED`.

## 7. 리뷰 · 매너 평가 (Review)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts/{postId}/reviews/targets` | 평가 대상 파티원 목록 (`ReviewMember[]`) | 🔒 파티원 |
| POST | `/api/posts/{postId}/reviews` | 파티원 평가 제출 | 🔒 파티원 |
| GET | `/api/review-tags` | 평가 태그 목록 | |

- **파티원**은 파티장(공고 작성자)과 신청이 `ACCEPTED` 인 회원입니다. 탈퇴한 회원은 파티원에서 빠집니다.
- 평가는 공고가 `COMPLETED`(작성자가 활동 완료 처리)일 때만 할 수 있습니다. 완료 처리는 `PATCH /api/posts/{postId}/status` (3절)로 합니다.
- 화면 흐름: 마이페이지 내 공고에서 `canComplete` 이면 「활동 완료」 버튼 → 완료되면 내 공고·참여한 파티 아이템에 `review` 가 생겨 「별점 평가」 버튼 → 평가 창에서 아래 targets 조회 후 제출 (8절 참고).
- 두 🔒 API 모두 확인 순서는 공고 존재(404) → 요청자가 파티원인지(403) → 공고 상태(409) 입니다.

**평가 태그 목록 (`GET /api/review-tags`)**

- 로그인 없이 조회할 수 있습니다. `review_tag` 중 `is_active = true` 인 태그를 `sort_order` 순으로 돌려줍니다. 평가 제출 시 `tags` 에는 `code` 를 보냅니다.

```json
[
  { "code": "on-time", "label": "#시간엄수" },
  { "code": "kind", "label": "#친절함" }
]
```

**평가 대상 파티원 (`GET /api/posts/{postId}/reviews/targets`)** 🔒 파티원

- 본인을 뺀 파티원 목록입니다. 파티장이 먼저, 그다음 승인 순입니다.
- `reviewed`: 내가 이 공고에서 이미 평가한 파티원이면 `true` (다시 평가할 수 없음).
- `characterName` 은 그 파티원의 이 게임 프로필(`member_game_profile.character_name`), `role` 은 신청 시 포지션이며 없으면 `null` 입니다 (파티장은 항상 `null`).
- 오류: 401 `UNAUTHORIZED`, 403 `NOT_PARTY_MEMBER`, 404 `POST_NOT_FOUND`(없음, 삭제됨, `postId` 가 1 이상의 정수가 아님), 409 `POST_NOT_COMPLETED`.

```json
[
  { "id": 3, "nickname": "빛나는오더", "avatarUrl": null, "level": 52, "game": "로스트아크", "characterName": null, "role": null, "isHost": true, "reviewed": true },
  { "id": 9, "nickname": "홀리한빛", "avatarUrl": null, "level": 40, "game": "로스트아크", "characterName": "홀리한빛", "role": "서포터", "isHost": false, "reviewed": false }
]
```

**파티원 평가 제출 (`POST /api/posts/{postId}/reviews`)** 🔒 파티원

```json
{
  "reviews": [
    { "targetMemberId": 9, "rating": 5, "tags": ["on-time", "kind"], "comment": "덕분에 한 번에 클리어했어요!" }
  ]
}
```

- 여러 파티원을 한 번에 평가합니다. 하나라도 실패하면 아무것도 저장하지 않습니다 (`review` + `review_tag_map` 를 한 트랜잭션으로 저장).
- `reviews` 1~15개. `targetMemberId` 1 이상의 정수(본인 불가, 한 요청 안에서 중복 불가), `rating` 1~5 정수, `tags` 선택(활성 태그 `code` 배열, 최대 10개, 중복은 하나로 합침), `comment` 선택(앞뒤 공백 제거 후 500자 이하, 빈 문자열은 `null`).
- 응답 `201 { "reviewIds": [41, 42] }` (요청 순서와 같음).
- 등록한 평가는 수정·삭제할 수 없습니다.
- 같은 트랜잭션에서 함께 반영합니다 ([DB 설계 결정 사항](./03-db-design.md#6-결정-사항) 2, 8-1, 8-3):
  - 대상 회원 `mannerTemp`: 리뷰 1건마다 5점 +0.5 / 4점 +0.2 / 3점 0 / 2점 −0.5 / 1점 −1.0, 한 건마다 0.0~99.9 로 보정. `reviewCount` +1.
  - 평가자 활동 점수: 리뷰 1건마다 `REVIEW_WRITE` +5 (`activity_point_log`), 누적 점수로 `level` 재계산 (지급으로 레벨이 내려가지는 않음).
  - 그 결과는 마이페이지 프로필(`mannerTemp` · `reviewCount` · `averageRating` · `topTags`), 공고 상세 `host`, 매너 랭킹에 바로 보입니다.
- 데이터 보정: `backend/` 에서 `npm run recalc:manner` (전체) 또는 `npm run recalc:manner -- 3 9` (회원 id) 로 리뷰 행만으로 매너 온도·받은 평가 수를 다시 계산합니다.
- 오류: 400 `INVALID_INPUT`(필드별, 예: `reviews[0].rating` — 없거나 비활성인 태그 포함), 401 `UNAUTHORIZED`, 403 `NOT_PARTY_MEMBER`(평가자) · `REVIEW_TARGET_NOT_PARTY_MEMBER`(대상), 404 `POST_NOT_FOUND`, 409 `POST_NOT_COMPLETED` · `ALREADY_REVIEWED`(이 공고에서 이미 평가한 파티원이 포함됨).

## 8. 마이페이지 · 랭킹

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/members/me/summary` | 내 프로필 요약 (매너 온도, 평균 별점, 게시글·완료 파티 수, 상위 태그 Top3) | 🔒 |
| GET | `/api/members/me/posts?page=&size=` | 내가 쓴 공고 | 🔒 |
| GET | `/api/members/me/applications?status=&page=&size=` | 내가 신청한 공고 (신청 상태 포함) | 🔒 |
| GET | `/api/members/me/comments?page=&size=` | 내가 쓴 댓글 | 🔒 |
| GET | `/api/members/me/favorites` | 즐겨찾는 유저 목록 | 🔒 |
| POST / DELETE | `/api/members/me/favorites/{memberId}` | 즐겨찾기 추가 / 해제 → `204` | 🔒 |
| GET | `/api/members/{memberId}` | 회원 프로필 (로그인하면 `viewer` 포함) | |
| GET | `/api/rankings/manner?limit=` | 매너 랭킹 (메인 명예의 전당) | |

구현: `backend/src/mypage/` (`/api/members` 에 마운트), 랭킹은 `backend/src/ranking/`

**매너 랭킹 (`GET /api/rankings/manner`)**

- 로그인 없이 조회합니다. `limit` 기본 10, 최대 50 (틀리면 400 `INVALID_INPUT`).
- 정상(`ACTIVE`) 회원 중 평가를 1건 이상 받은 회원을 매너 온도 높은 순 → 받은 평가 수 많은 순 → id 순으로 정렬합니다.
- `mainGame`: 대표 게임(없으면 `null`), `topTag`: 가장 많이 받은 평가 태그(없으면 `null`).

```json
[
  { "rank": 1, "id": 5, "nickname": "갓공대장", "avatarUrl": null, "level": 30, "mannerTemp": 99.0, "reviewCount": 142,
    "mainGame": { "code": "lostark", "name": "로스트아크" }, "topTag": { "code": "order", "label": "#오더장인" } }
]
```

**프로필 (`GET /api/members/me/summary`, `GET /api/members/{memberId}`)**

```json
{
  "id": 1,
  "nickname": "빛나는힐러",
  "avatarUrl": null,
  "bio": "멘탈 강하고 트라이 즐기는 힐러입니다.",
  "ageRange": "20대",
  "level": 48,
  "mannerTemp": 98.4,
  "reviewCount": 30,
  "averageRating": 4.7,
  "postCount": 24,
  "completedPartyCount": 156,
  "games": [{ "code": "lostark", "name": "로스트아크", "isMain": true, "playStyle": "casual", "playTimeSlot": "평일 21-24" }],
  "topTags": [{ "rank": 1, "code": "kind", "label": "#친절함", "count": 28, "percent": 93 }],
  "createdAt": "2026-10-01T00:00:00.000Z",
  "ageRangePublic": false,
  "viewer": { "isMe": false, "favorited": true }
}
```

- `averageRating`: 최근 30건 평가의 평균 별점(소수 첫째 자리). 평가가 없으면 `null`.
- `postCount`: 삭제되지 않은 작성 공고 수. `completedPartyCount`: `COMPLETED` 공고 중 파티장이었거나 `ACCEPTED` 로 참여한 수.
- `topTags`: 받은 평가 태그 상위 3개. `percent` = 그 태그를 고른 평가 수 ÷ 받은 평가 수 × 100 (반올림).
- `games`: 게이머 프로필(`member_game_profile`), 대표 게임이 먼저 옵니다.
- `ageRange`: 비공개(`ageRangePublic: false`)면 본인 외에는 `null`.
- `ageRangePublic` 은 `me/summary` 에만, `viewer` 는 `{memberId}` 에만 있습니다. `viewer` 는 비로그인이면 `null`.
- 오류: `me/summary` — 401 `UNAUTHORIZED` (토큰 없음·만료, 탈퇴한 회원). `{memberId}` — 404 `MEMBER_NOT_FOUND` (없음, 탈퇴, `memberId` 가 1 이상의 정수가 아님), 401 (헤더가 있는데 토큰이 잘못됨).

**목록 공통**

- `page`(기본 1) · `size`(기본 10, 최대 50), 최신순. 응답은 `{ items, page, size, totalCount, totalPages }`, 값이 올바르지 않으면 400 `INVALID_INPUT`(필드별).
- 삭제된 공고(와 그 공고의 신청·댓글)는 나오지 않습니다.

**내가 쓴 공고 아이템 (`/me/posts`)**

```json
{
  "id": 7, "category": "mmorpg", "game": "lostark", "gameName": "로스트아크", "type": "raid",
  "title": "[카멘] 숙련 서폿 구해요", "current": 8, "max": 8,
  "schedule": "2026-11-15T12:00:00.000Z", "scheduleTbd": false, "status": "COMPLETED",
  "views": 129, "commentCount": 3, "createdAt": "2026-11-12T11:30:00.000Z",
  "canComplete": false,
  "review": { "targetCount": 7, "reviewedCount": 2 }
}
```

- `canComplete`: 「활동 완료」 버튼을 보여줄지. 공고가 `OPEN`·`CLOSED` 이고 승인된 파티원(탈퇴 제외)이 1명 이상이며 출발 시간이 지났으면(일정 미정 포함) `true` → `PATCH /api/posts/{postId}/status` `{ status: "COMPLETED" }`.
- `review`: 「별점 평가」 버튼용 진행 상황. 공고가 `COMPLETED` 일 때만 있고 아니면 `null`. `targetCount` 는 나를 뺀 파티원 수, `reviewedCount` 는 그중 내가 평가한 수 (같으면 평가 완료).

**내가 신청한 공고 아이템 (`/me/applications`)**

- `status`: `PENDING` · `ACCEPTED` · `REJECTED` · `CANCELED` · `NO_SHOW` 중 하나로 거를 수 있습니다 (생략 시 전체). 지원 중인 공고는 `status=PENDING`, 참여한 파티는 `status=ACCEPTED`.
- `post` 는 내가 쓴 공고 아이템에서 `views`·`commentCount`·`createdAt` 을 빼고 `host`(파티장 닉네임, 탈퇴 시 `"탈퇴한 회원"`)를 더한 형태입니다.

```json
{
  "id": 3, "status": "PENDING", "role": "서포터", "appliedAt": "2026-11-12T00:00:00.000Z",
  "post": { "id": 7, "category": "mmorpg", "game": "lostark", "gameName": "로스트아크", "type": "raid", "title": "...", "current": 7, "max": 8, "schedule": null, "scheduleTbd": true, "status": "OPEN", "host": "빛나는오더" },
  "review": null
}
```

- `review`: 신청이 `ACCEPTED` 이고 공고가 `COMPLETED` 이면 「별점 평가」 진행 상황 `{ targetCount, reviewedCount }` (내 공고 아이템과 같은 의미), 아니면 `null`.

**내가 쓴 댓글 아이템 (`/me/comments`)**

- 삭제된 댓글은 제외하고, 가려진 댓글(`HIDDEN`)은 본인에게 `status` 와 함께 보여줍니다. `reply` 는 대댓글 여부입니다.

```json
{
  "id": 5, "postId": 7, "postTitle": "[에키드나] 바로 출발", "game": "lostark", "gameName": "로스트아크",
  "content": "서폿 자리 남았으면 신청합니다!", "secret": false, "reply": false, "status": "VISIBLE",
  "createdAt": "2026-11-11T00:00:00.000Z"
}
```

**즐겨찾기 (`/me/favorites`)**

- 목록은 배열이며 최근 추가순, 탈퇴한 회원은 빠집니다. `mainGame` 은 대표 게임(없으면 `null`), `playStyle` 은 대표 게임의 플레이 스타일입니다.
- 추가·해제는 `204`. 이미 즐겨찾기한 유저를 추가하거나, 즐겨찾기하지 않은 유저를 해제해도 `204` 입니다.
- 추가 오류: 400 `CANNOT_FAVORITE_SELF` (자기 자신), 404 `MEMBER_NOT_FOUND` (없음·탈퇴·잘못된 id).

```json
[
  { "id": 2, "nickname": "철수", "avatarUrl": null, "level": 52, "mannerTemp": 36.5,
    "mainGame": { "code": "lostark", "name": "로스트아크" }, "playStyle": "hard", "favoritedAt": "2026-11-01T00:00:00.000Z" }
]
```

## 9. 관리자 (Admin) 🛡️

구현: `backend/src/admin/` (Routes / Controller / Service / Repository / Validator / Constants)

- 관리자 계정은 회원과 분리된 `admin_account` 테이블을 씁니다 (REQ-ADMIN-001). 회원가입 API는 없고 DB에 직접 등록합니다.
- 🛡️ 표시 API는 `Authorization: Bearer {관리자 accessToken}` 이 필요합니다. 관리자 토큰은 JWT `typ: "admin"` 이라 **회원 토큰으로는 401** 입니다.
  관리자 토큰은 Refresh Token 없이 Access Token 하나만 발급하며, 만료되면 다시 로그인합니다 (유효 시간 `ACCESS_TOKEN_TTL_SECONDS`).
- 상태 값은 화면에는 한글로 표시하지만, API에서는 아래 영문 enum으로 주고받고 프론트에서 매핑합니다.
- 목록 API는 공통 페이지네이션 `?page=1&size=10` (size 1~100, 기본 10) 을 따르고 `{ items, page, size, totalCount, totalPages }` 로 응답합니다.
- 모든 목록은 `sort=desc|asc`(작성·접수·처리 일시 기준, 기본 `desc`)와 기간 `from`·`to`(`YYYY-MM-DD`, **한국 시간 날짜**, 양 끝 포함)를 받습니다. 형식이 틀리거나 `from` 이 `to` 보다 늦으면 `400 INVALID_INPUT`.
- 처리 API(신고 처리·공고 삭제·제재·댓글 처리)와 로그인, 회원 상세 조회는 `admin_action_log` 에 처리자·IP와 함께 기록됩니다 (REQ-ADMIN-007).
- 시간은 UTC ISO-8601 (`2026-11-13T01:52:10.000Z`) 로 응답합니다.

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/admin/auth/login` | 관리자 로그인 `{ userId, password }` → `{ accessToken, admin }` | |
| GET | `/api/admin/me` | 로그인한 관리자 정보 `{ id, userId, name, role }` | 🛡️ |
| GET | `/api/admin/dashboard` | 대시보드 통계 | 🛡️ |
| GET | `/api/admin/reports?status=&type=&q=&page=&size=` | 신고 목록 (`q`: 신고 대상·신고자 닉네임, 사유) | 🛡️ |
| GET | `/api/admin/reports/{reportId}` | 신고 상세 (피신고 회원의 제재 이력 포함) | 🛡️ |
| PATCH | `/api/admin/reports/{reportId}` | 신고 처리 `{ status, action?, days?, memo? }` | 🛡️ |
| GET | `/api/admin/posts?status=&game=&reported=&q=&page=&size=` | 공고 목록 (`q`: 제목·작성자 닉네임, `game`: 게임 코드, `reported=true\|false`: 신고 접수 여부) | 🛡️ |
| GET | `/api/admin/posts/{postId}` | 공고 상세 (이 공고에 접수된 신고, 관리자 처리 이력 포함) | 🛡️ |
| DELETE | `/api/admin/posts/{postId}` | 공고 삭제 `{ reason }` → `204` | 🛡️ |
| GET | `/api/admin/members?status=&reported=&q=&page=&size=` | 회원 목록 (`q`: 닉네임·아이디·이메일, `reported=true\|false`: 받은 신고 여부) | 🛡️ |
| GET | `/api/admin/members/{memberId}` | 회원 상세 (개인정보 포함, 조회 기록 남김) | 🛡️ |
| POST | `/api/admin/members/{memberId}/sanctions` | 제재 `{ type, days?, reason }` → `201` | 🛡️ |
| GET | `/api/admin/comments?status=&secret=&q=&page=&size=` | 댓글 목록 (`q`: 내용·작성자 닉네임·공고 제목, `secret=true\|false`: 비밀 댓글 여부. 비밀 댓글 본문 포함) | 🛡️ |
| PATCH | `/api/admin/comments/{commentId}` | 댓글 가림/복구/삭제 `{ status, reason }` | 🛡️ |
| GET | `/api/admin/history?kind=&q=&page=&size=` | 관리자 처리 이력 (`q`: 처리자 이름, 대상, 사유) | 🛡️ |

**상태 enum**

| 구분 | API 값 (화면 표시) |
| --- | --- |
| 신고 `status` | `PENDING`(접수) · `IN_PROGRESS`(처리 중) · `DONE`(완료) · `REJECTED`(기각) |
| 신고 `type` | `MEMBER`(유저) · `NO_SHOW`(노쇼) · `POST`(공고) · `COMMENT`(댓글) |
| 신고 `action` | `WARN`(경고) · `SUSPEND`(이용 정지) · `BAN`(영구 정지) · `DELETE_CONTENT`(공고·댓글 삭제) · `DISMISS`(기각 시 자동) |
| 공고 `status` | `OPEN`(모집 중) · `CLOSED`(마감) · `COMPLETED`(종료) · `DELETED`(삭제됨) |
| 회원 `status` | `ACTIVE`(정상) · `WARNED`(경고) · `SUSPENDED`(이용 정지) · `BANNED`(영구 정지) · `WITHDRAWN`(탈퇴) |
| 제재 `type` | `WARNING`(경고) · `SUSPEND`(기간 정지) · `BAN`(영구 정지) |
| 댓글 `status` | `VISIBLE`(정상) · `REPORTED`(신고됨 — 목록 전용, VISIBLE 이면서 신고 1건 이상) · `HIDDEN`(가림) · `DELETED`(삭제) |
| 이력 `kind` | `REPORT`(신고 처리) · `POST_DELETE`(공고 삭제) · `COMMENT`(댓글 가림·복구·삭제) · `SANCTION`(회원 제재) · `MEMBER_VIEW`(회원 정보 조회) · `LOGIN`(관리자 로그인) |

**관리자 로그인 응답** `200 OK`

```json
{ "success": true, "data": { "accessToken": "eyJ...", "admin": { "id": 1, "userId": "master", "name": "관리자 마스터", "role": "ADMIN" } } }
```

**대시보드 응답**

```json
{
  "pendingReportCount": 14,
  "todayReportCount": 28,
  "openPostCount": 156,
  "recentSanctionCount": 42,
  "recentSanctionDays": 7,
  "recentSanctions": [
    { "id": 3, "member": { "id": 2, "nickname": "비매너", "userId": "toxic" }, "type": "SUSPEND", "reason": "욕설",
      "startsAt": "2026-11-13T01:51:54.000Z", "endsAt": "2026-11-20T01:51:54.000Z", "createdAt": "2026-11-13T01:51:54.000Z" }
  ]
}
```

- `pendingReportCount`: `PENDING` + `IN_PROGRESS` 신고 수
- `todayReportCount`: 한국 시간 오늘 0시 이후 접수된 신고 수
- `recentSanctionCount`: 최근 `recentSanctionDays`(7)일 동안의 제재 수, `recentSanctions` 는 최근 5건

**목록 아이템**

```json
// 신고
{ "id": 1, "createdAt": "...", "type": "MEMBER", "targetId": 2, "reason": "욕설", "target": { "id": 2, "nickname": "비매너" }, "reporter": { "id": 1, "nickname": "신고자" }, "status": "PENDING" }

// 공고
{ "id": 1, "createdAt": "...", "category": "aos", "game": "리그 오브 레전드", "gameCode": "lol", "partyType": "rank", "content": "솔로 랭크", "title": "...",
  "author": { "id": 2, "nickname": "비매너" }, "current": 1, "max": 4, "status": "OPEN", "reportCount": 1 }

// 회원 (탈퇴 회원은 nickname · userId 가 null)
{ "id": 2, "nickname": "비매너", "userId": "toxic", "joinedAt": "...", "lastLoginAt": null, "mannerTemp": 36.5, "reportCount": 3, "sanctionCount": 1, "status": "SUSPENDED", "suspendedUntil": "..." }

// 댓글
{ "id": 1, "createdAt": "...", "post": { "id": 1, "title": "..." }, "parentId": null, "author": { "id": 2, "nickname": "비매너" }, "text": "...", "secret": false, "reportCount": 1, "status": "REPORTED" }

// 처리 이력 (detail 은 처리마다 다름. targetLabel = 대상 이름, reason = 사유)
{ "id": 7, "createdAt": "...", "kind": "SANCTION", "actionType": "MEMBER_SANCTION", "targetType": "MEMBER", "targetId": 2, "adminName": "관리자 마스터",
  "detail": { "targetLabel": "비매너", "type": "WARNING", "days": null, "reason": "비매너" } }
```

**상세 응답에 추가되는 필드**

| API | 추가 필드 |
| --- | --- |
| 신고 상세 | `detail`, `action`, `memo`, `handledBy`(관리자 이름), `handledAt`, `reporter.userId`, `target { id, nickname, userId, mannerTemp, status }`, `post { id, title }`, `comment { id, content }`(댓글 신고만), `sanctions[]`(피신고 회원의 제재 이력) |
| 공고 상세 | `body`, `partyName`, `playStyle`, `requiredSpec`, `schedule`, `voiceRequired`, `views`, `commentCount`, `updatedAt`, `deletedAt`, `deleteReason`, `deletedBy`, `author.userId`, `author.mannerTemp`, `author.sanctionCount`, `reports[] { id, createdAt, reason, status, reporter }`(이 공고 신고), `logs[]`(최근 20건) |
| 회원 상세 | `email`, `phone`, `name`, `ageRange`, `bio`, `avatarUrl`, `reviewCount`, `level`, `withdrawnAt`, `stats { postCount, partyCount, noShowCount, reportCount }`, `games[] { game, isMain, characterName, playTimeSlot, playStyle }`, `sanctions[] { id, type, reason, startsAt, endsAt, reportId, releasedAt, adminName, createdAt }` |

**신고 처리** `PATCH /api/admin/reports/{reportId}`

| `status` | `action` | 처리 내용 |
| --- | --- | --- |
| `IN_PROGRESS` | 지정 불가 | 담당 관리자·메모만 기록 |
| `DONE` | 필수: `WARN` · `SUSPEND`(+`days` 1~365) · `BAN` | 피신고 회원에게 제재 추가 (`sanction.report_id` = 이 신고) + 회원 상태 변경 + 알림 |
| `DONE` | `DELETE_CONTENT` | 공고 신고면 공고 삭제(작성자 알림), 댓글 신고면 댓글 삭제. 이미 삭제된 대상은 삭제를 건너뜀. 회원·노쇼 신고에는 불가 |
| `REJECTED` | 지정 불가 (`DISMISS` 로 저장) | 제재 없이 종료 |

- `memo` (500자 이하)는 `admin_memo` 에 저장하고, 제재·삭제 사유로도 씁니다. 비우면 신고 사유(`reason_code`)를 씁니다.
- `DONE` · `REJECTED` 가 된 신고는 다시 바꿀 수 없습니다 (`409 REPORT_ALREADY_HANDLED`).
- 응답: `{ "id": 1, "status": "DONE", "action": "SUSPEND" }`

**제재 규칙** (신고 처리와 `POST /members/{memberId}/sanctions` 공통)

- `SUSPEND` 는 `days`(1~365) 필수, 그 외 타입은 `days` 지정 불가. `reason` 은 1~500자.
- 회원 상태는 더 무거운 쪽으로만 바뀝니다 (`ACTIVE` < `WARNED` < `SUSPENDED` < `BANNED`). 정지 중인 회원에게 경고를 주면 `SUSPENDED` 가 유지됩니다.
- 정지가 겹치면 더 늦게 끝나는 시각을 `member.suspended_until` 에 남깁니다.
- 회원 알림함에 `SANCTION` 알림을 추가합니다. 공고 삭제 시에는 작성자에게 `POST_DELETED` 알림(사유 포함)을 보냅니다 (REQ-ADMIN-003).
- 제재 응답 `201`: `{ "id": 2, "memberId": 2, "type": "WARNING", "memberStatus": "SUSPENDED", "suspendedUntil": "..." }`

**댓글 처리** `PATCH /api/admin/comments/{commentId}` — `status`: `HIDDEN`(가림) · `VISIBLE`(복구) · `DELETED`(삭제), `reason` 1~200자 필수.
삭제하면 공고의 `comment_count` 를 1 줄입니다. 삭제된 댓글은 되돌릴 수 없습니다.

**관리자 API 에러 코드**

| 상태 | code | 상황 |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | 쿼리·본문·경로 id 형식 오류. `error.fields` 에 필드별 오류 |
| 400 | `INVALID_REPORT_ACTION` | 회원·노쇼 신고에 `DELETE_CONTENT` |
| 401 | `UNAUTHORIZED` · `TOKEN_EXPIRED` | 관리자 토큰 없음·위조·회원 토큰 / 만료 |
| 401 | `INVALID_CREDENTIALS` | 관리자 아이디 또는 비밀번호 불일치 |
| 403 | `ADMIN_INACTIVE` | `admin_account.status` 가 `ACTIVE` 가 아님 (로그인·토큰 사용 모두) |
| 404 | `REPORT_NOT_FOUND` · `POST_NOT_FOUND` · `MEMBER_NOT_FOUND` · `COMMENT_NOT_FOUND` | 대상 없음 |
| 409 | `REPORT_ALREADY_HANDLED` | 이미 완료·기각된 신고 |
| 409 | `POST_ALREADY_DELETED` | 이미 삭제된 공고 |
| 409 | `MEMBER_WITHDRAWN` · `MEMBER_ALREADY_BANNED` | 탈퇴 회원 / 이미 영구 정지된 회원 제재 |
| 409 | `COMMENT_ALREADY_DELETED` · `COMMENT_STATUS_UNCHANGED` | 삭제된 댓글 변경 / 같은 상태로 변경 |

**관리자 계정 등록 예시** (비밀번호는 BCrypt 해시로 저장)

```bash
# backend/ 에서 해시 만들기
node -e "console.log(require('bcryptjs').hashSync('비밀번호', 10))"
```

```sql
INSERT INTO admin_account (login_id, password_hash, name) VALUES ('master', '$2b$10$...', '관리자 마스터');
```
