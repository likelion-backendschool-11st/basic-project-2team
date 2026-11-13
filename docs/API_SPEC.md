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

**내 정보 응답 (`LoggedInUser`)**

```json
{ "id": "u-healer", "nickname": "빛나는힐러", "level": 48, "mannerTemp": 98.4, "avatarUrl": "https://...", "online": true }
```

## 3. 공고 (Post)

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
| GET | `/api/games` | 게임 목록 + 게임별 상세 분류 `[{ code, name, categoryCode, contents: [{ code, name, type, maxHeadcount }] }]` (공고 작성 폼용) | |
| GET | `/api/categories` | 카테고리 목록 + 공고 수 | |

- `category`: `mmorpg` · `fps` · `aos` · `steam` · `etc` (생략 시 전체)
- `sort`: `recent`(기본) · `views` · `urgent`
- `tags`: 쉼표로 구분한 태그(최대 5개, `#` 는 있어도 됨). 지정한 태그를 **모두** 가진 공고만 조회합니다.
- `page`(기본 1) · `size`(기본 8, 최대 50), `excludeClosed=true` 이면 모집 중(`OPEN`) 공고만 조회합니다 (기본 `false`).
- `urgent`: 출발 시간이 가까운 순(일정 미정은 뒤), 남은 자리가 적은 순입니다. `recent` 는 최신순, `views` 는 조회수순입니다.
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

## 5. 댓글 (Comment)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/posts/{postId}/comments?sort=oldest\|newest&page=&size=4` | 댓글 목록 (루트 댓글 기준 페이징, 대댓글 포함) | |
| POST | `/api/posts/{postId}/comments` | 댓글/대댓글 작성 `{ text, parentId?, secret }` | 🔒 |
| PATCH | `/api/comments/{commentId}` | 댓글 수정 `{ text }` | 🔒 작성자 |
| DELETE | `/api/comments/{commentId}` | 댓글 삭제 (대댓글 함께 삭제) | 🔒 작성자 |

- 비밀 댓글은 댓글 작성자와 공고 작성자에게만 본문을 노출합니다.

## 6. 신고 (Report)

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/reports` | 신고 `{ targetType: "USER"\|"NO_SHOW"\|"POST"\|"COMMENT", targetId, reason, detail? }` | 🔒 |

- `reason`: `욕설 및 비하 발언` · `스팸 / 도배` · `부적절한 광고` · `개인정보 노출` · `기타`

## 7. 리뷰 · 매너 평가 (Review)

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

## 8. 마이페이지 · 랭킹

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/members/me/summary` | 프로필 통계 (매너 온도, 파티 수, 상위 태그 Top3) | 🔒 |
| GET | `/api/members/me/posts?page=` | 내가 쓴 공고 | 🔒 |
| GET | `/api/members/me/comments?page=` | 내가 쓴 댓글 | 🔒 |
| GET | `/api/members/me/favorites` | 즐겨찾는 유저 목록 | 🔒 |
| POST / DELETE | `/api/members/me/favorites/{memberId}` | 즐겨찾기 추가 / 해제 | 🔒 |
| GET | `/api/rankings/manner` | 매너 랭킹 (메인 명예의 전당) | |

## 9. 관리자 (Admin) 🛡️

구현: `backend/src/admin/` (Routes / Controller / Service / Repository / Validator / Constants)

- 관리자 계정은 회원과 분리된 `admin_account` 테이블을 씁니다 (REQ-ADMIN-001). 회원가입 API는 없고 DB에 직접 등록합니다.
- 🛡️ 표시 API는 `Authorization: Bearer {관리자 accessToken}` 이 필요합니다. 관리자 토큰은 JWT `typ: "admin"` 이라 **회원 토큰으로는 401** 입니다.
  관리자 토큰은 Refresh Token 없이 Access Token 하나만 발급하며, 만료되면 다시 로그인합니다 (유효 시간 `ACCESS_TOKEN_TTL_SECONDS`).
- 상태 값은 화면에는 한글로 표시하지만, API에서는 아래 영문 enum으로 주고받고 프론트에서 매핑합니다.
- 목록 API는 공통 페이지네이션 `?page=1&size=10` (size 1~100, 기본 10) 을 따르고 `{ items, page, size, totalCount, totalPages }` 로 응답합니다. 최신순 정렬입니다.
- 처리 API(신고 처리·공고 삭제·제재·댓글 처리)와 로그인, 회원 상세 조회는 `admin_action_log` 에 처리자·IP와 함께 기록됩니다 (REQ-ADMIN-007).
- 시간은 UTC ISO-8601 (`2026-11-13T01:52:10.000Z`) 로 응답합니다.

| Method | URI | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/admin/auth/login` | 관리자 로그인 `{ userId, password }` → `{ accessToken, admin }` | |
| GET | `/api/admin/me` | 로그인한 관리자 정보 `{ id, userId, name, role }` | 🛡️ |
| GET | `/api/admin/dashboard` | 대시보드 통계 | 🛡️ |
| GET | `/api/admin/reports?status=&type=&page=&size=` | 신고 목록 | 🛡️ |
| GET | `/api/admin/reports/{reportId}` | 신고 상세 (피신고 회원의 제재 이력 포함) | 🛡️ |
| PATCH | `/api/admin/reports/{reportId}` | 신고 처리 `{ status, action?, days?, memo? }` | 🛡️ |
| GET | `/api/admin/posts?status=&q=&page=&size=` | 공고 목록 (`q`: 제목·작성자 닉네임) | 🛡️ |
| GET | `/api/admin/posts/{postId}` | 공고 상세 (이 공고의 관리자 처리 이력 포함) | 🛡️ |
| DELETE | `/api/admin/posts/{postId}` | 공고 삭제 `{ reason }` → `204` | 🛡️ |
| GET | `/api/admin/members?status=&q=&page=&size=` | 회원 목록 (`q`: 닉네임·아이디·이메일) | 🛡️ |
| GET | `/api/admin/members/{memberId}` | 회원 상세 (개인정보 포함, 조회 기록 남김) | 🛡️ |
| POST | `/api/admin/members/{memberId}/sanctions` | 제재 `{ type, days?, reason }` → `201` | 🛡️ |
| GET | `/api/admin/comments?status=&q=&page=&size=` | 댓글 목록 (`q`: 내용·작성자 닉네임, 비밀 댓글 본문 포함) | 🛡️ |
| PATCH | `/api/admin/comments/{commentId}` | 댓글 가림/복구/삭제 `{ status, reason }` | 🛡️ |
| GET | `/api/admin/history?kind=&page=&size=` | 관리자 처리 이력 | 🛡️ |

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
{ "id": 1, "createdAt": "...", "category": "aos", "game": "리그 오브 레전드", "partyType": "rank", "content": "솔로 랭크", "title": "...",
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
| 공고 상세 | `body`, `partyName`, `playStyle`, `requiredSpec`, `schedule`, `voiceRequired`, `views`, `commentCount`, `updatedAt`, `deletedAt`, `deleteReason`, `deletedBy`, `author.userId`, `author.mannerTemp`, `logs[]`(최근 20건) |
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
