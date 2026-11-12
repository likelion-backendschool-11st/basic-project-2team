# DB 설계안 (MySQL 8)

OurParty 서비스의 테이블 설계안입니다. [요구사항 명세](./02-requirements.md)와 [API 정의서](./API_SPEC.md)를 기준으로 작성했습니다.

> ⚠️ **초안** — 두 문서에 없는 길이·정책 값은 일반적인 값으로 가정하고 **(가정)** 으로 표시했습니다.
> 팀에서 확정하면 해당 칸과 [6. 확정이 필요한 가정](#6-확정이-필요한-가정)을 함께 수정해 주세요. SQL(DDL)은 설계 확정 후 작성합니다.

## 0. 공통 규칙

| 항목 | 정한 값 | 이유 |
| --- | --- | --- |
| 엔진 / 문자셋 | InnoDB, `utf8mb4`, `utf8mb4_0900_ai_ci` | 한글과 이모지를 저장할 수 있습니다. 대소문자를 구분하지 않는 collation이라 `Healer`와 `healer`가 같은 값으로 취급되어 중복 검사에 걸립니다. |
| PK | `id BIGINT UNSIGNED AUTO_INCREMENT` | API 예시의 `"u-healer"` 같은 문자열 ID는 목 데이터입니다. 실제 PK는 숫자로 둡니다. |
| 시간 | `DATETIME`(초 단위), 애플리케이션에서 UTC로 저장 | `TIMESTAMP`는 2038년 문제가 있습니다. API 응답에서 `+09:00`으로 바꿔 내보냅니다. |
| enum 값 | MySQL `ENUM` 대신 `VARCHAR(20)`, 값은 Java enum으로 관리 | MySQL `ENUM`은 값을 추가할 때마다 `ALTER`가 필요합니다. 상태값이 아직 확정되지 않았습니다. |
| 공통 컬럼 | `created_at`, `updated_at`. 소프트 삭제하는 테이블에만 `deleted_at` | – |
| 소프트 삭제 대상 | 회원, 공고, 댓글 | 신고·제재·리뷰 기록이 이 행들을 참조하므로 행을 남겨야 합니다. |
| 관리자 계정 | 회원과 **분리한 테이블** | ADMIN-001 "일반 사용자와 접근 경로·권한 분리". 관리자가 랭킹이나 검색에 섞여 나오지 않습니다. |

## 1. 테이블 목록

| 도메인 | 테이블 | 용도 |
| --- | --- | --- |
| 회원 | `member`, `member_agreement`, `member_game_profile`, `member_withdrawal` | 계정, 약관 동의 이력, 게이머 프로필, 탈퇴자 분리 보관 |
| 인증 | `email_verification`, `password_reset_token`, `refresh_token` | 이메일 인증, 비밀번호 재설정, 토큰 |
| 마스터 | `category`, `game`, `game_content`, `tag`, `review_tag` | 장르, 게임, 레이드·던전, 공고 태그, 평가 태그 |
| 공고 | `post`, `post_tag`, `post_draft`, `post_scrap` | 공고, 공고-태그 연결, 임시저장, 공고 즐겨찾기(스크랩) |
| 파티 | `post_application` | 신청·승인·취소. 승인된 신청이 곧 파티원입니다. |
| 댓글 | `comment` | 댓글과 대댓글(1단계) |
| 평가 | `review`, `review_tag_map` | 별점, 한 줄 평, 태그 |
| 즐겨찾기 | `favorite_member` | 사용자 즐겨찾기 |
| 알림 | `notification`, `notification_subscription` | 알림함, 관심 알림 설정. 이번 범위에 넣을지 **확정 필요** |
| 신고·관리 | `report`, `sanction`, `admin_account`, `admin_action_log` | 신고, 제재, 관리자 계정, 처리·접근 이력 |

## 2. 테이블별 컬럼

### 2.1 `member`

| 컬럼 | 타입 | NULL | 제약 / 기본값 | 근거 / 비고 |
| --- | --- | --- | --- | --- |
| id | BIGINT UNSIGNED | N | PK | |
| login_id | VARCHAR(20) | Y | UNIQUE | SIGNUP-003. 4~20자 (가정). 탈퇴 시 NULL로 비움 |
| password_hash | VARCHAR(100) | Y | | BCrypt 결과 60자에 Spring `{bcrypt}` 접두사까지 고려한 여유 길이 |
| nickname | VARCHAR(10) | Y | UNIQUE | 2~10자 (프론트 코드). 탈퇴 시 NULL로 비워서 다른 사람이 다시 쓸 수 있게 함 |
| email | VARCHAR(100) | Y | UNIQUE | API의 중복 확인 대상. 탈퇴 시 NULL |
| phone | VARCHAR(20) | Y | UNIQUE | 1인 1계정 (가정). 하이픈 없이 저장 |
| name | VARCHAR(50) | Y | | API에만 있는 항목. 필수 여부 확정 필요 |
| age_range | VARCHAR(10) | Y | | PROFILE-002 |
| age_range_public | BOOLEAN | N | TRUE | PROFILE-002 공개 범위 |
| bio | VARCHAR(200) | Y | | API 프로필 수정의 "소개" |
| avatar_url | VARCHAR(500) | Y | | |
| status | VARCHAR(20) | N | `ACTIVE` | ACTIVE / WARNED / SUSPENDED / BANNED / WITHDRAWN (관리자 회원 목록의 상태와 맞춤) |
| suspended_until | DATETIME | Y | | 기간 정지가 끝나는 시각 |
| manner_temp | DECIMAL(4,1) | N | 36.5 (가정) | ADD-002. 리뷰가 등록될 때마다 다시 계산해 저장하는 비정규화 컬럼 |
| review_count | INT UNSIGNED | N | 0 | 매너 온도 계산용 |
| login_fail_count | TINYINT UNSIGNED | N | 0 | LOGIN-006 |
| locked_until | DATETIME | Y | | LOGIN-006 일시 잠금 |
| last_login_at | DATETIME | Y | | |
| withdrawn_at | DATETIME | Y | | 소프트 삭제 시각 |

API의 `level`은 정의가 없어서 넣지 않았습니다. `online`은 실시간 상태라 DB에 저장하지 않습니다.

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
| play_time_slot | VARCHAR(50) | | 예: `평일 21-24` (형식 확정 필요) |
| play_style | VARCHAR(20) | | API 프로필 수정의 "플레이 스타일" |

### 2.4 `member_withdrawal` — 탈퇴자 분리 보관 (WITHDRAW-003, 004)

| 컬럼 | 타입 | 제약 | 비고 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK | |
| member_id | BIGINT UNSIGNED | | FK를 걸지 않음. 보관용 사본 |
| phone_hash / email_hash | CHAR(64) | | SHA-256 해시. 원문 대신 해시로 재가입 여부만 확인 |
| reason | VARCHAR(200) | | API 탈퇴 요청의 `reason` |
| had_sanction | BOOLEAN | | 제재 이력 여부 |
| rejoin_blocked_until | DATETIME | | 재가입 제한 기간 (확정 필요) |
| purge_at | DATETIME | | 파기 예정일. 개인정보처리방침의 보관 기간과 맞춤 |
| withdrawn_at | DATETIME | | |

### 2.5 인증 테이블

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `email_verification` | id, email VARCHAR(100), code_hash CHAR(64), attempt_count TINYINT, expires_at, verified_at, created_at | 인증코드는 해시로 저장. 시도 횟수를 제한 |
| `password_reset_token` | id, member_id FK, token_hash CHAR(64) UNIQUE, expires_at, used_at, created_at | LOGIN-007. 한 번 쓰면 `used_at` 기록 |
| `refresh_token` | id, member_id FK, token_hash CHAR(64) UNIQUE, expires_at, revoked_at, created_at | API_SPEC의 JWT 방식 기준. 세션 방식으로 가면 테이블 삭제, Redis로 대체할 수도 있음 |

### 2.6 마스터 테이블

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `category` | code VARCHAR(20) PK, name VARCHAR(30), sort_order, is_active | `mmorpg`, `fps`, … steam 포함 여부가 미정이라 데이터 행으로 관리 |
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
| title | VARCHAR(100) | N | | (가정) |
| body | TEXT | N | | 마크다운 본문. TEXT 최대 64KB |
| party_name | VARCHAR(30) | Y | | |
| play_style | VARCHAR(20) | Y | | API의 `style` |
| required_spec | VARCHAR(200) | Y | | POST-001 요구 스펙 |
| headcount | TINYINT UNSIGNED | N | | 모집 정원. 범위 2~16 (가정) |
| current_count | TINYINT UNSIGNED | N | 1 | 파티장 포함 현재 인원. 승인할 때 같은 트랜잭션에서 증가 |
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
| `post_tag` | post_id, tag_id | PK(post_id, tag_id) | 한 공고에 같은 태그 중복 불가. 공고당 최대 5개 (가정, 애플리케이션에서 검증) |
| `post_draft` | id, member_id UNIQUE, payload JSON, updated_at | 회원당 1개 (가정) | 작성 중인 미완성 값을 그대로 담기 위해 JSON |
| `post_scrap` | member_id, post_id, created_at | PK(member_id, post_id) | FAV-001 공고 즐겨찾기 |

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

취소한 사람이 다시 신청하면 같은 행의 상태를 `PENDING`으로 되돌립니다 (가정).

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
| report_count | INT UNSIGNED | 기본 0 | REPORT-004 자동 임시 가림 기준값과 비교 |
| deleted_at | DATETIME | | |

### 2.11 평가 · 즐겨찾기

| 테이블 | 컬럼 | 제약 | 비고 |
| --- | --- | --- | --- |
| `review` | id, post_id FK, reviewer_id FK, target_id FK, rating TINYINT, comment VARCHAR(500), created_at | UNIQUE(post_id, reviewer_id, target_id). CHECK rating 1~5, CHECK reviewer ≠ target | MySQL은 8.0.16부터 CHECK 제약을 실제로 검사합니다 |
| `review_tag_map` | review_id, review_tag_id | PK(review_id, review_tag_id) | |
| `favorite_member` | member_id, target_member_id, created_at | PK(member_id, target_member_id). CHECK 자기 자신 불가 | FAV-002 |

### 2.12 알림 (범위 확정 필요)

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `notification` | id, member_id FK, type VARCHAR(30), message VARCHAR(200), post_id FK NULL, is_read BOOLEAN, created_at | type 예: APPLICATION_RESULT, POST_UPDATED, INTEREST_POST, POST_DELETED, SANCTION |
| `notification_subscription` | id, member_id FK, game_id FK, game_content_id FK NULL, enabled BOOLEAN | NOTI-001 관심 게임·레이드 |

### 2.13 신고 · 관리

| 테이블 | 컬럼 | 비고 |
| --- | --- | --- |
| `report` | id, reporter_id FK, target_type VARCHAR(20), target_id BIGINT, target_member_id FK, post_id FK NULL, reason_code VARCHAR(30), detail VARCHAR(500), status VARCHAR(20), action VARCHAR(30), admin_memo VARCHAR(500), handled_by FK → admin_account, handled_at, created_at | target_type은 MEMBER / NO_SHOW / POST / COMMENT. 대상 종류가 여러 개라 target_id에는 FK를 걸지 않습니다. 대신 신고당한 회원을 target_member_id에 따로 저장합니다. |
| `sanction` | id, member_id FK, type VARCHAR(20), reason VARCHAR(500), starts_at, ends_at NULL, report_id FK NULL, admin_id FK, released_at, released_by FK, release_reason VARCHAR(200), created_at | type은 WARNING / SUSPEND / BAN. ends_at이 NULL이면 영구 정지. 해제 정보도 함께 기록 (ADMIN-005) |
| `admin_account` | id, login_id VARCHAR(20) UNIQUE, password_hash, name VARCHAR(50), role VARCHAR(20), status, last_login_at, created_at | ADMIN-001 |
| `admin_action_log` | id, admin_id FK, action_type VARCHAR(30), target_type VARCHAR(20), target_id BIGINT, detail JSON, ip VARCHAR(45), created_at | ADMIN-007. 추가만 하고 수정·삭제하지 않음. 관리자 로그인 같은 접근 기록도 action_type으로 함께 저장 |

## 3. 관계

| 부모 | 자식 | 관계 | 부모 삭제 시 (FK 동작) | 이유 |
| --- | --- | --- | --- | --- |
| member | post, comment, post_application, review, report | 1:N | RESTRICT | 회원은 소프트 삭제라 실제 행이 지워지지 않습니다. 기록을 보존해야 합니다. |
| member | member_agreement, member_game_profile, post_draft, refresh_token, notification, notification_subscription | 1:N | CASCADE | 회원에게만 딸린 데이터 |
| member | favorite_member, post_scrap | N:M | CASCADE | |
| category → game → game_content | | 1:N | RESTRICT | 마스터 데이터. 사용 중인 행은 지우지 않고 `is_active=false`로 숨김 |
| post | post_application, comment, review | 1:N | RESTRICT | 공고는 소프트 삭제라 함께 보존 |
| post | post_tag, post_scrap | 1:N | CASCADE | |
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
| report | UQ(reporter_id, target_type, target_id) | 중복 신고 제한 (REPORT-005) | 한 대상은 한 번만 신고 가능 (가정). 기간 단위로 허용하면 UNIQUE를 빼고 애플리케이션에서 검사 |
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
| 신고, 제재, 관리 이력, 리뷰 | 삭제하지 않음 | 증빙과 감사 기록 |
| 스크랩, 즐겨찾기, 태그 연결 | 하드 삭제 | 지워도 남겨야 할 이력이 아닙니다. |
| 인증코드, 토큰, 임시저장, 알림 | 하드 삭제 (배치) | 만료되거나 보관 기간이 지나면 지웁니다. |

## 6. 확정이 필요한 가정

1. **필드 길이:** login_id 4~20, title 100, party_name 30, headcount 2~16, 공고당 태그 5개
2. **매너 온도:** 초기값 36.5와 계산식
3. **current_count:** 파티장을 인원에 포함할지
4. **공고 즐겨찾기 이름:** "스크랩"과 "즐겨찾기" 중 하나로 통일 (테이블은 `post_scrap`으로 둠)
5. **중복 신고 기준:** 한 대상당 영구 1회인지, 기간 단위로 다시 신고할 수 있는지
6. **로그인 방식:** 세션과 JWT 중 무엇을 쓸지 (`refresh_token` 테이블을 둘지가 달라짐)
7. **알림:** 이번 범위에 넣을지
8. **API의 `level` 필드:** 무엇을 뜻하는지 정의 필요
