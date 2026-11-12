# DB 설계안 (MySQL 8)

OurParty 서비스의 테이블 설계안입니다. [요구사항 명세](./02-requirements.md)와 [API 정의서](./API_SPEC.md)를 기준으로 작성했습니다.

> 두 문서에 없던 길이·정책 값은 권장안으로 정했습니다. 결정 내용과 이유는 [6. 결정 사항](#6-결정-사항)에 모아 두었습니다.
> 구현 중에 문제가 생기면 해당 칸과 6절을 함께 수정해 주세요. 다음 단계는 이 문서를 기준으로 SQL(DDL)을 작성하는 것입니다.

## 0. 공통 규칙

| 항목 | 정한 값 | 이유 |
| --- | --- | --- |
| 엔진 / 문자셋 | InnoDB, `utf8mb4`, `utf8mb4_0900_ai_ci` | 한글과 이모지를 저장할 수 있습니다. 대소문자를 구분하지 않는 collation이라 `Healer`와 `healer`가 같은 값으로 취급되어 중복 검사에 걸립니다. |
| PK | `id BIGINT UNSIGNED AUTO_INCREMENT` | API 예시의 `"u-healer"` 같은 문자열 ID는 목 데이터입니다. 실제 PK는 숫자로 둡니다. |
| 시간 | `DATETIME`(초 단위), 애플리케이션에서 UTC로 저장 | `TIMESTAMP`는 2038년 문제가 있습니다. API 응답에서 `+09:00`으로 바꿔 내보냅니다. |
| enum 값 | MySQL `ENUM` 대신 `VARCHAR(20)`, 값은 Java enum으로 관리 | MySQL `ENUM`은 값을 추가할 때마다 `ALTER`가 필요합니다. 상태값은 앞으로 늘어날 수 있습니다. |
| 공통 컬럼 | `created_at`, `updated_at`. 소프트 삭제하는 테이블에만 `deleted_at` | – |
| 소프트 삭제 대상 | 회원, 공고, 댓글 | 신고·제재·리뷰 기록이 이 행들을 참조하므로 행을 남겨야 합니다. |
| 관리자 계정 | 회원과 **분리한 테이블** | ADMIN-001 "일반 사용자와 접근 경로·권한 분리". 관리자가 랭킹이나 검색에 섞여 나오지 않습니다. |

## 1. 테이블 목록

| 도메인 | 테이블 | 용도 |
| --- | --- | --- |
| 회원 | `member`, `member_agreement`, `member_game_profile`, `member_withdrawal`, `activity_point_log` | 계정, 약관 동의 이력, 게이머 프로필, 탈퇴자 분리 보관, 활동 점수 이력 |
| 인증 | `email_verification`, `password_reset_token`, `refresh_token` | 이메일 인증, 비밀번호 재설정, 토큰 |
| 마스터 | `category`, `game`, `game_content`, `tag`, `review_tag` | 장르, 게임, 레이드·던전, 공고 태그, 평가 태그 |
| 공고 | `post`, `post_tag`, `post_draft`, `post_scrap` | 공고, 공고-태그 연결, 임시저장, 공고 즐겨찾기(스크랩) |
| 파티 | `post_application` | 신청·승인·취소. 승인된 신청이 곧 파티원입니다. |
| 댓글 | `comment` | 댓글과 대댓글(1단계) |
| 평가 | `review`, `review_tag_map` | 별점, 한 줄 평, 태그 |
| 즐겨찾기 | `favorite_member` | 사용자 즐겨찾기 |
| 알림 | `notification`, `notification_subscription` | 알림함, 관심 알림 설정 |
| 신고·관리 | `report`, `sanction`, `admin_account`, `admin_action_log` | 신고, 제재, 관리자 계정, 처리·접근 이력 |

## 2. 테이블별 컬럼

### 2.1 `member`

| 컬럼 | 타입 | NULL | 제약 / 기본값 | 근거 / 비고 |
| --- | --- | --- | --- | --- |
| id | BIGINT UNSIGNED | N | PK | |
| login_id | VARCHAR(20) | Y | UNIQUE | SIGNUP-003. 영문 소문자·숫자 4~20자. 탈퇴 시 NULL로 비움 |
| password_hash | VARCHAR(100) | Y | | BCrypt 결과 60자에 Spring `{bcrypt}` 접두사까지 고려한 여유 길이 |
| nickname | VARCHAR(10) | Y | UNIQUE | 2~10자 (프론트 코드). 탈퇴 시 NULL로 비워서 다른 사람이 다시 쓸 수 있게 함 |
| email | VARCHAR(100) | Y | UNIQUE | API의 중복 확인 대상. 탈퇴 시 NULL |
| phone | VARCHAR(20) | Y | UNIQUE | 1인 1계정. 하이픈 없이 저장 |
| name | VARCHAR(50) | Y | | 선택 입력. 서비스에 실명이 필요하지 않아 개인정보 최소 수집 원칙에 따름 |
| age_range | VARCHAR(10) | Y | | PROFILE-002 |
| age_range_public | BOOLEAN | N | TRUE | PROFILE-002 공개 범위 |
| bio | VARCHAR(200) | Y | | API 프로필 수정의 "소개" |
| avatar_url | VARCHAR(500) | Y | | |
| status | VARCHAR(20) | N | `ACTIVE` | ACTIVE / WARNED / SUSPENDED / BANNED / WITHDRAWN (관리자 회원 목록의 상태와 맞춤) |
| suspended_until | DATETIME | Y | | 기간 정지가 끝나는 시각 |
| manner_temp | DECIMAL(4,1) | N | 36.5 | ADD-002. 범위 0.0~99.9. 리뷰가 등록될 때마다 같은 트랜잭션에서 다시 계산해 저장하는 비정규화 컬럼 (계산식은 6절) |
| review_count | INT UNSIGNED | N | 0 | 매너 온도 계산용 |
| activity_point | INT UNSIGNED | N | 0 | 누적 활동 점수. `activity_point_log`의 합계를 저장하는 비정규화 컬럼 |
| level | SMALLINT UNSIGNED | N | 1 | 서비스 활동 레벨 (1~99). activity_point가 바뀔 때 같은 트랜잭션에서 다시 계산 (계산식은 6절) |
| login_fail_count | TINYINT UNSIGNED | N | 0 | LOGIN-006 |
| locked_until | DATETIME | Y | | LOGIN-006 일시 잠금 |
| last_login_at | DATETIME | Y | | |
| withdrawn_at | DATETIME | Y | | 소프트 삭제 시각 |

API의 `level`은 **서비스 활동 레벨**(`member.level`)입니다. 공고 작성, 댓글, 리뷰, 파티 완료 같은 활동으로 점수가 쌓이면 올라갑니다. 게임 캐릭터 레벨은 `member_game_profile.character_info`에 따로 있습니다. `online`은 실시간 상태라 DB에 저장하지 않습니다.

### 2.2 `member_agreement`

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| member_id | BIGINT UNSIGNED | PK①, FK → member | |
| agreement_type | VARCHAR(20) | PK② | TERMS / PRIVACY / MARKETING (SIGNUP-004) |
| terms_version | VARCHAR(20) | | 약관이 바뀌었을 때 어느 판에 동의했는지 증빙 |
| agreed | BOOLEAN | | 선택 항목은 FALSE일 수 있음 |
| agreed_at | DATETIME | | |

### 2.3 `member_game_profile`

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| member_id | BIGINT UNSIGNED | FK → member, UNIQUE(member_id, game_id) | 같은 게임을 두 번 등록할 수 없음 |
| game_id | BIGINT UNSIGNED | FK → game | |
| is_main | BOOLEAN | | 대표 게임 표시 (PROFILE-001) |
| character_name | VARCHAR(30) | | |
| character_info | JSON | | 게임마다 항목이 달라서(레벨, 아이템 레벨, 티어 등) 고정 컬럼 대신 JSON |
| play_time_slot | VARCHAR(50) | | 자유 입력 문자열. 예: `평일 21-24`. 표시용이라 검색·필터에 쓰지 않음 |
| play_style | VARCHAR(20) | | API 프로필 수정의 "플레이 스타일" |

### 2.4 `member_withdrawal` — 탈퇴자 분리 보관 (WITHDRAW-003, 004)

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| member_id | BIGINT UNSIGNED | | FK를 걸지 않음. 보관용 사본 |
| phone_hash / email_hash | CHAR(64) | | SHA-256 해시. 원문 대신 해시로 재가입 여부만 확인 |
| reason | VARCHAR(200) | | API 탈퇴 요청의 `reason` |
| had_sanction | BOOLEAN | | 제재 이력 여부 |
| rejoin_blocked_until | DATETIME | | NULL이면 제한 없음. 경고·기간 정지 이력은 탈퇴일 + 6개월, 영구 정지(BAN) 이력은 `9999-12-31` |
| purge_at | DATETIME | | 파기 예정일. 제재 이력이 있으면 rejoin_blocked_until과 같고, 없으면 탈퇴일 + 30일. 개인정보처리방침의 보관 기간과 맞춤 |
| withdrawn_at | DATETIME | | |

### 2.4.1 `activity_point_log` — 활동 점수 이력

활동 레벨의 근거 기록입니다. 점수를 줄 때와 회수할 때 한 행씩 추가하고, 수정하지 않습니다.

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| member_id | BIGINT UNSIGNED | FK → member, UNIQUE(member_id, action_type, ref_id) | 같은 활동으로 점수를 두 번 받지 않도록 막음 |
| action_type | VARCHAR(30) | | POST_CREATE / COMMENT_CREATE / REVIEW_WRITE / PARTY_COMPLETE / POST_REVOKE / COMMENT_REVOKE (점수표는 6절) |
| ref_id | BIGINT UNSIGNED | | 점수의 근거가 된 행의 id (post / comment / review). 대상 종류가 여러 개라 FK를 걸지 않음 |
| point | INT | | 지급은 양수, 회수는 음수 |
| created_at | DATETIME | | 하루 지급 횟수 제한을 검사할 때 사용 |

### 2.5 인증 테이블

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `email_verification` | id, email VARCHAR(100), code_hash CHAR(64), attempt_count TINYINT, expires_at, verified_at, created_at | 인증코드는 해시로 저장. 시도 횟수를 제한 |
| `password_reset_token` | id, member_id FK, token_hash CHAR(64) UNIQUE, expires_at, used_at, created_at | LOGIN-007. 한 번 쓰면 `used_at` 기록 |
| `refresh_token` | id, member_id FK, token_hash CHAR(64) UNIQUE, expires_at, revoked_at, created_at | API_SPEC의 JWT 방식(Access + Refresh)으로 확정. 토큰 원문 대신 해시를 저장하고, 로그아웃·비밀번호 변경 시 `revoked_at`을 기록 |

### 2.6 마스터 테이블

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `category` | code VARCHAR(20) PK, name VARCHAR(30), sort_order, is_active | `mmorpg`, `fps`, `aos`, `steam`, `etc` 5개 (프론트·API와 동일). 나중에 늘거나 줄 수 있어 데이터 행으로 관리 |
| `game` | id, category_code FK, code VARCHAR(30) UNIQUE, name VARCHAR(50), sort_order, is_active | `lostark` 같은 코드 |
| `game_content` | id, game_id FK, content_type VARCHAR(20), code VARCHAR(30), name VARCHAR(50), UNIQUE(game_id, code) | API의 `detail`(예: `kamen`). content_type은 RANK / DUNGEON / RAID (POST-001). 관심 알림 대상(NOTI-001) |
| `tag` | id, name VARCHAR(20) UNIQUE | 공고 태그 |
| `review_tag` | id, code VARCHAR(30) UNIQUE, label VARCHAR(30), sort_order, is_active | `on-time` → `#시간엄수` |

### 2.7 `post`

| 컬럼 | 타입 | NULL | 제약 / 기본값 | 근거 / 비고 |
| --- | --- | --- | --- | --- |
| id | BIGINT UNSIGNED | N | PK | |
| author_id | BIGINT UNSIGNED | N | FK → member | |
| category_code | VARCHAR(20) | N | FK → category | `game`에서 알 수 있지만, 목록 조회가 가장 잦아서 공고에 중복 저장 |
| game_id | BIGINT UNSIGNED | N | FK → game | |
| game_content_id | BIGINT UNSIGNED | Y | FK → game_content | API의 `detail` |
| party_type | VARCHAR(20) | N | | API의 `type` (raid 등) |
| title | VARCHAR(100) | N | | 2~100자 |
| body | TEXT | N | | 마크다운 본문. TEXT 최대 64KB |
| party_name | VARCHAR(30) | Y | | |
| play_style | VARCHAR(20) | Y | | API의 `style` |
| required_spec | VARCHAR(200) | Y | | POST-001 요구 스펙 |
| headcount | TINYINT UNSIGNED | N | | 파티장을 **포함한** 전체 정원. 범위 2~16 |
| current_count | TINYINT UNSIGNED | N | 1 | 파티장을 포함한 현재 인원. 승인할 때 같은 트랜잭션에서 증가하고, `headcount`에 도달하면 status를 `CLOSED`로 변경 |
| schedule_at | DATETIME | Y | | NULL이면 출발 시간 미정 (`scheduleTbd`) |
| voice_required | BOOLEAN | N | FALSE | |
| status | VARCHAR(20) | N | `OPEN` | OPEN / CLOSED / COMPLETED / DELETED |
| view_count | INT UNSIGNED | N | 0 | |
| comment_count | INT UNSIGNED | N | 0 | MAIN-008 "최다 Q&A" 정렬용 |
| deleted_at | DATETIME | Y | | |
| deleted_by_admin_id | BIGINT UNSIGNED | Y | FK → admin_account | 관리자가 삭제한 경우만 |
| delete_reason | VARCHAR(200) | Y | | ADMIN-003. 프론트에서도 200자 |

### 2.8 공고 부속 테이블

| 테이블 | 컬럼 | 제약 | 비고 |
| --- | --- | --- | --- |
| `post_tag` | post_id, tag_id | PK(post_id, tag_id) | 한 공고에 같은 태그 중복 불가. 공고당 최대 5개 (애플리케이션에서 검증) |
| `post_draft` | id, member_id UNIQUE, payload JSON, updated_at | 회원당 1개. 새로 임시저장하면 덮어씀 | 작성 중인 미완성 값을 그대로 담기 위해 JSON |
| `post_scrap` | member_id, post_id, created_at | PK(member_id, post_id) | FAV-001. 공고는 "스크랩", 사용자는 "즐겨찾기"로 용어를 나눔 |

### 2.9 `post_application`

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| post_id | BIGINT UNSIGNED | FK → post, UNIQUE(post_id, applicant_id) | 중복 지원 불가 (APPLY-001) |
| applicant_id | BIGINT UNSIGNED | FK → member | |
| role | VARCHAR(30) | | 포지션 |
| message | VARCHAR(200) | | |
| status | VARCHAR(20) | 기본 `PENDING` | PENDING / ACCEPTED / REJECTED / CANCELED / NO_SHOW |
| late_cancel | BOOLEAN | 기본 FALSE | APPLY-002. 출발 임박 시점의 취소를 노쇼와 구분 |
| decided_at, canceled_at | DATETIME | | |

`CANCELED` 상태인 사람이 다시 신청하면 같은 행의 상태를 `PENDING`으로 되돌립니다. `REJECTED`·`NO_SHOW` 상태에서는 같은 공고에 다시 신청할 수 없습니다.

### 2.10 `comment`

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| post_id | BIGINT UNSIGNED | FK → post | |
| author_id | BIGINT UNSIGNED | FK → member | |
| parent_id | BIGINT UNSIGNED | FK → comment, NULL 가능 | 대댓글. 깊이 1단계는 애플리케이션에서 검증 |
| content | VARCHAR(500) | | 프론트에서도 500자 |
| is_secret | BOOLEAN | | 비밀 댓글 |
| status | VARCHAR(20) | 기본 `VISIBLE` | VISIBLE / HIDDEN(관리자 가림, Q&A-003) / DELETED |
| report_count | INT UNSIGNED | 기본 0 | REPORT-004. 5건 이상이면 status를 `HIDDEN`으로 자동 변경 (같은 사람의 중복 신고는 report UNIQUE로 막히므로 서로 다른 신고자 수) |
| deleted_at | DATETIME | | |

### 2.11 평가 · 즐겨찾기

| 테이블 | 컬럼 | 제약 | 비고 |
| --- | --- | --- | --- |
| `review` | id, post_id FK, reviewer_id FK, target_id FK, rating TINYINT, comment VARCHAR(500), created_at | UNIQUE(post_id, reviewer_id, target_id). CHECK rating 1~5, CHECK reviewer ≠ target | MySQL은 8.0.16부터 CHECK 제약을 실제로 검사합니다 |
| `review_tag_map` | review_id, review_tag_id | PK(review_id, review_tag_id) | |
| `favorite_member` | member_id, target_member_id, created_at | PK(member_id, target_member_id). CHECK 자기 자신 불가 | FAV-002 |

### 2.12 알림

이번 범위에 포함합니다. 실시간 푸시 없이 알림함 조회(폴링)로 시작합니다.

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `notification` | id, member_id FK, type VARCHAR(30), message VARCHAR(200), post_id FK NULL, is_read BOOLEAN, created_at | type 예: APPLICATION_RESULT, POST_UPDATED, INTEREST_POST, POST_DELETED, SANCTION |
| `notification_subscription` | id, member_id FK, game_id FK, game_content_id FK NULL, enabled BOOLEAN | NOTI-001 관심 게임·레이드 |

### 2.13 신고 · 관리

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `report` | id, reporter_id FK, target_type VARCHAR(20), target_id BIGINT, target_member_id FK, post_id FK NULL, reason_code VARCHAR(30), detail VARCHAR(500), status VARCHAR(20), action VARCHAR(30), admin_memo VARCHAR(500), handled_by FK → admin_account, handled_at, created_at | target_type은 MEMBER / NO_SHOW / POST / COMMENT이고, target_id는 각각 member / post_application / post / comment의 id입니다. NO_SHOW는 파티(신청 행) 단위로 신고하므로 같은 사람의 노쇼를 파티마다 신고할 수 있습니다. 대상 종류가 여러 개라 target_id에는 FK를 걸지 않습니다. 대신 신고당한 회원을 target_member_id에 따로 저장합니다. |
| `sanction` | id, member_id FK, type VARCHAR(20), reason VARCHAR(500), starts_at, ends_at NULL, report_id FK NULL, admin_id FK, released_at, released_by FK, release_reason VARCHAR(200), created_at | type은 WARNING / SUSPEND / BAN. ends_at이 NULL이면 영구 정지. 해제 정보도 함께 기록 (ADMIN-005) |
| `admin_account` | id, login_id VARCHAR(20) UNIQUE, password_hash, name VARCHAR(50), role VARCHAR(20), status, last_login_at, created_at | ADMIN-001 |
| `admin_action_log` | id, admin_id FK, action_type VARCHAR(30), target_type VARCHAR(20), target_id BIGINT, detail JSON, ip VARCHAR(45), created_at | ADMIN-007. 추가만 하고 수정·삭제하지 않음. 관리자 로그인 같은 접근 기록도 action_type으로 함께 저장 |

## 3. 관계

| 부모 | 자식 | 관계 | 부모 삭제 시 (FK 동작) | 이유 |
| --- | --- | --- | --- | --- |
| member | post, comment, post_application, review, report, sanction | 1:N | RESTRICT | 회원은 소프트 삭제라 실제 행이 지워지지 않습니다. 기록을 보존해야 합니다. |
| member | member_agreement, member_game_profile, post_draft, refresh_token, password_reset_token, notification, notification_subscription, activity_point_log | 1:N | CASCADE | 회원에게만 딸린 데이터 |
| member | favorite_member, post_scrap | N:M | CASCADE | |
| category, game, game_content, tag, review_tag | 이 마스터 테이블을 참조하는 모든 FK (game, game_content, post, member_game_profile, post_tag, review_tag_map, notification_subscription) | 1:N | RESTRICT | 마스터 데이터. 사용 중인 행은 지우지 않고 `is_active=false`로 숨김 |
| post | post_application, comment, review, report | 1:N | RESTRICT | 공고는 소프트 삭제라 함께 보존 |
| post | post_tag, post_scrap | 1:N | CASCADE | |
| post | notification | 1:N | SET NULL | 알림은 공고 링크가 없어도 문구만으로 의미가 있습니다. |
| comment | comment (parent_id) | 1:N, 자기 참조 | RESTRICT | 소프트 삭제 시 "삭제된 댓글입니다"로 표시 |
| review | review_tag_map | 1:N | CASCADE | |
| report | sanction | 1:0..1 | SET NULL | 신고 없이 내린 제재도 있습니다. |
| admin_account | report.handled_by, sanction, admin_action_log, post.deleted_by_admin_id | 1:N | RESTRICT | 처리자 기록 보존 |

## 4. 인덱스

PK와 UNIQUE는 그 자체가 인덱스라서, 중복되는 인덱스는 따로 만들지 않았습니다.

| 테이블 | 인덱스 | 쓰이는 곳 | 이유 |
| --- | --- | --- | --- |
| member | UQ(login_id), UQ(nickname), UQ(email), UQ(phone) | 중복 확인 API, 로그인 | 중복 불가 규칙을 DB에서도 보장. 탈퇴 시 값을 NULL로 비우면 다른 사람이 같은 값을 다시 쓸 수 있습니다 (MySQL UNIQUE는 NULL을 여러 개 허용) |
| member | (status, created_at) | 관리자 회원 목록 상태 필터 | 상태로 걸러낸 뒤 최신순 정렬까지 인덱스로 처리 |
| member | (status, manner_temp) | 매너 랭킹 | 정상 회원만 매너 온도 순으로 상위 N명 조회 |
| activity_point_log | UQ(member_id, action_type, ref_id) | 중복 지급 방지 | |
| activity_point_log | (member_id, action_type, created_at) | 하루 지급 횟수 제한 검사 | 특정 회원의 오늘 지급 건수를 범위로 조회 |
| post | (category_code, created_at) | 카테고리별 최신순 목록 | 가장 많이 호출되는 쿼리. 정렬까지 인덱스로 처리 |
| post | (category_code, view_count) | 조회수순 정렬, 장르별 인기 공고 (MAIN-008) | |
| post | (status, schedule_at) | 마감 임박 (MAIN-009, `sort=urgent`), 자동 종료 배치 (POST-007) | 모집 중이면서 출발 시간이 가까운 공고를 범위로 조회 |
| post | (game_id, created_at) | 게임별 상세 검색 (POST-005) | game_id FK 인덱스도 겸함 |
| post | (author_id, created_at) | 내 공고 | author_id FK 인덱스도 겸함 |
| post | FULLTEXT(title, party_name) WITH PARSER ngram | 통합 검색 (MAIN-007) | 기본 FULLTEXT 파서는 한글 단어를 제대로 나누지 못합니다. `LIKE '%검색어%'`는 인덱스를 못 탑니다. |
| post_tag | (tag_id, post_id) | 태그 필터 | PK가 (post_id, tag_id)라서 태그로 찾는 방향은 별도 인덱스가 필요합니다. |
| post_scrap | (post_id) | 스크랩 수 집계, 공고 삭제 시 정리 | PK가 member_id로 시작해서 post_id로는 찾을 수 없습니다. |
| post_application | UQ(post_id, applicant_id) | 중복 지원 차단, 신청자 목록 | post_id로 시작하므로 신청자 목록 조회에도 쓰입니다. |
| post_application | (applicant_id, status, created_at) | 마이페이지의 지원 중인 공고 (MYPAGE-001) | |
| comment | (post_id, parent_id, created_at) | 루트 댓글 페이징, 대댓글 묶기 | 공고 상세에서 매번 실행되는 쿼리 |
| comment | (author_id, created_at) | 내 댓글 | |
| comment | (status, created_at) | 관리자 댓글 목록 | |
| review | UQ(post_id, reviewer_id, target_id) | 중복 평가 방지 | |
| review | (target_id, created_at) | 매너 온도 재계산, 이달의 파티장 (MAIN-010) | 특정 회원이 기간 안에 받은 평가만 범위로 조회 |
| review_tag_map | (review_tag_id) | 태그 통계 | |
| favorite_member | (target_member_id) | 회원 탈퇴 시 정리, 즐겨찾기한 사람 수 | |
| notification | (member_id, is_read, created_at) | 안 읽은 알림 수, 알림 목록 | |
| notification_subscription | UQ(member_id, game_id, game_content_id) / (game_id, game_content_id, enabled) | 중복 설정 방지 / 공고 등록 시 알림 받을 대상 조회 | game_content_id가 NULL이면 UNIQUE가 중복을 막지 못합니다. 애플리케이션에서도 검사해야 합니다. |
| report | UQ(reporter_id, target_type, target_id) | 중복 신고 제한 (REPORT-005) | 같은 사람이 같은 대상을 신고하는 것은 영구히 한 번만 가능 |
| report | (status, created_at) | 관리자 신고 처리 대기열 | |
| report | (target_type, target_id) | 대상별 신고 수, 자동 임시 가림 | |
| report | (target_member_id) | 회원 상세의 신고 이력 | |
| sanction | (member_id, created_at) | 회원 제재 이력, 재가입 제한 판단 | |
| sanction | (ends_at) | 정지 자동 해제 배치 | |
| admin_action_log | (admin_id, created_at), (action_type, created_at), (target_type, target_id) | 관리자 이력의 `kind` 필터, 대상별 이력 | |
| member_withdrawal | (phone_hash), (email_hash), (purge_at) | 재가입 차단 확인, 파기 배치 | |
| email_verification | (email, created_at), (expires_at) | 최근 발송 건 조회와 재발송 제한, 만료 데이터 정리 | |
| refresh_token / password_reset_token | UQ(token_hash), (member_id) | 토큰 검증, 로그아웃 시 전부 폐기 | |

## 5. 삭제 정책

| 대상 | 방식 | 처리 |
| --- | --- | --- |
| 회원 탈퇴 | 소프트 삭제 + 개인정보 제거 | 행은 남기고 status를 `WITHDRAWN`으로 바꿉니다. login_id·nickname·email·phone·name은 NULL로 비우고 화면에는 "탈퇴한 회원"으로 표시합니다. 재가입 제한과 법령상 보관에 필요한 최소 정보만 `member_withdrawal`에 해시로 옮깁니다. MYPAGE-003(즉시 삭제)과 WITHDRAW-003(분리 보관)의 충돌을 이 방식으로 절충했습니다. |
| 공고 | 소프트 삭제 | status를 `DELETED`로 바꾸고 deleted_at을 기록합니다. 신청·댓글·리뷰는 그대로 둡니다. |
| 댓글 | 소프트 삭제 | API의 "대댓글 함께 삭제"는 **대댓글도 DELETED 상태로 바꾸는 것**으로 해석했습니다. |
| 신청 취소 | 상태 변경 | 행을 지우지 않고 CANCELED로 바꿉니다. 노쇼와 구분해 기록하려면 이력이 남아야 합니다. |
| 신고, 제재, 관리 이력, 리뷰, 활동 점수 이력 | 삭제하지 않음 | 증빙과 감사 기록. 활동 점수는 회수할 때도 행을 지우지 않고 음수 행을 추가합니다. |
| 스크랩, 즐겨찾기, 태그 연결 | 하드 삭제 | 지워도 남겨야 할 이력이 아닙니다. |
| 인증코드, 토큰, 임시저장, 알림 | 하드 삭제 (배치) | 만료되거나 보관 기간이 지나면 지웁니다. |

## 6. 결정 사항

요구사항과 API 문서에 없던 값을 아래와 같이 정했습니다. 구현하면서 문제가 생기면 이 표와 해당 칸을 함께 수정합니다.

| # | 항목 | 결정 | 이유 |
| --- | --- | --- | --- |
| 1 | 필드 길이 | login_id 영문 소문자·숫자 4~20자, title 2~100자, party_name 30자, 공고당 태그 최대 5개 | 일반적인 커뮤니티 기준. 목록 카드에서 제목·태그가 넘치지 않는 길이 |
| 2 | 매너 온도 | 초기값 36.5, 범위 0.0~99.9. 리뷰 1건마다 별점별로 더함: 5점 +0.5 / 4점 +0.2 / 3점 0 / 2점 −0.5 / 1점 −1.0 | 평균 방식과 달리 리뷰가 쌓일수록 신뢰가 반영됩니다. 나쁜 평가를 더 크게 반영해 비매너를 억제합니다. 리뷰 행만으로 언제든 다시 계산할 수 있습니다. |
| 3 | 파티 인원 | headcount·current_count 모두 **파티장 포함**. current_count 기본값 1 | 게임의 "8인 파티"처럼 전체 인원으로 말하는 것이 자연스럽습니다. ⚠️ 프론트 작성 화면 문구("작성자를 제외한 필요한 파티원 수")와 `1명` 선택지를 이 기준에 맞춰 고쳐야 합니다. |
| 4 | 용어 | 공고는 "스크랩"(`post_scrap`), 사용자는 "즐겨찾기"(`favorite_member`) | 프론트 공고 상세가 이미 "스크랩"을 쓰고 있어 화면과 맞습니다. |
| 5 | 중복 신고 | 같은 신고자가 같은 대상을 신고하는 것은 영구 1회. 노쇼는 신청 행(`post_application`) 단위라 파티마다 신고 가능 | UNIQUE 하나로 DB에서 보장됩니다. 허위 신고 반복자의 신고 기능 제한은 운영하면서 필요해지면 추가합니다. |
| 6 | 로그인 방식 | JWT (Access + Refresh), `refresh_token` 테이블 사용 | API_SPEC이 이미 `Authorization: Bearer`와 `/api/auth/refresh` 기준으로 작성되어 있습니다. |
| 7 | 알림 | 이번 범위에 포함 (알림함 + 관심 알림 설정). 실시간 푸시 없이 폴링 | NOTI-002 지원 결과 알림, POST-002 수정 알림이 요구사항에 있습니다. 실시간 연결(WebSocket/SSE)은 범위가 커서 뒤로 미룹니다. |
| 8 | API의 `level` | 서비스 활동 레벨. `member.level`에 저장하고 `activity_point_log`로 근거를 남김 | 페이지에서 활동할수록 올라가는 레벨입니다. 이력을 남겨야 중복 지급을 막고, 회수와 재계산을 할 수 있습니다. |
| 8-1 | 활동 점수표 | 공고 작성 +10 (하루 3회까지) / 댓글 작성 +2 (하루 10회까지) / 리뷰 작성 +5 (리뷰 1건마다) / 파티 완료 +20 (공고가 `COMPLETED`가 될 때 파티장과 승인된 파티원) | 하루 횟수 제한으로 도배를 막습니다. 리뷰와 파티 완료는 실제 파티를 거쳐야 하므로 제한을 두지 않습니다. |
| 8-2 | 점수 회수 | 공고·댓글이 삭제되면(본인 또는 관리자) 그 글로 받은 점수를 같은 양만큼 회수 (`POST_REVOKE`, `COMMENT_REVOKE`). 점수가 줄면 레벨도 내려갈 수 있음 | 글을 쓰고 지우기를 반복해 점수를 쌓는 것을 막습니다. |
| 8-3 | 레벨 계산식 | 레벨 L에서 L+1로 오르려면 `50 × L`점 필요. 즉 레벨 L의 누적 기준은 `25 × L × (L − 1)`점 (Lv.2 = 50, Lv.3 = 150, Lv.10 = 2,250). 최대 Lv.99 | 레벨이 오를수록 다음 레벨까지 더 많은 활동이 필요해 초반에는 빨리 오르고 뒤로 갈수록 천천히 오릅니다. |
| 9 | name(실명) | 선택 입력 | 서비스 기능에 실명이 필요하지 않습니다. |
| 10 | 재가입 제한 | 제재 이력이 없으면 제한 없음. 경고·기간 정지 이력은 탈퇴 후 6개월, 영구 정지 이력은 영구 제한 | WITHDRAW-004. 탈퇴 후 바로 재가입해 제재를 피하는 것을 막는 최소 기간 |
| 11 | 탈퇴자 보관 기간 | 제재 이력이 있으면 재가입 제한이 끝날 때까지, 없으면 30일 | WITHDRAW-003. 해시만 보관해 원문 개인정보는 남기지 않습니다. |
| 12 | 댓글 자동 가림 | 서로 다른 신고자 5명 이상이면 `HIDDEN` | REPORT-004. 관리자가 확인 후 복구할 수 있습니다. |
| 13 | 재신청 | `CANCELED`만 같은 공고에 재신청 가능, `REJECTED`·`NO_SHOW`는 불가 | 거절된 사람이 반복 신청하는 것을 막습니다. |
| 14 | 카테고리 | `mmorpg`, `fps`, `aos`, `steam`, `etc` 5개 | 프론트·API와 동일 |
| 15 | 마스터 데이터 FK | category·game·game_content·tag·review_tag를 참조하는 FK는 모두 RESTRICT | 쓰이는 마스터 행은 지우지 않고 `is_active`로 숨깁니다. |
