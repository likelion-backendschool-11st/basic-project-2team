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

