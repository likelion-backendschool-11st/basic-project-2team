# ERD

[DB 설계안](./03-db-design.md)의 테이블과 관계를 ERD로 옮긴 문서입니다. 컬럼 길이·제약·인덱스의 근거는 03 문서에 있고, 이 문서는 **구조를 한눈에 보는 용도**입니다.
설계가 바뀌면 03 문서를 먼저 고치고 이 문서를 맞춰 주세요.

> GitHub와 VS Code(Markdown Preview Mermaid Support 확장)에서 다이어그램으로 렌더링됩니다.

## 표기법

| 표기 | 뜻 |
| --- | --- |
| `\|\|--o{` | 1 : 0..N (부모 1개에 자식 0개 이상) |
| `\|o--o{` | 0..1 : 0..N (자식의 FK가 NULL일 수 있음) |
| `\|\|--o\|` | 1 : 0..1 |
| `PK` / `FK` / `UK` | 기본키 / 외래키 / UNIQUE |

- `bigint`는 모두 `BIGINT UNSIGNED`, `int`·`smallint`·`tinyint`는 `UNSIGNED`입니다. 예외는 설명에 `signed`로 표시했습니다.
- 모든 테이블에 있는 공통 컬럼 `created_at`, `updated_at`은 다이어그램에서 생략했습니다.
- 다른 절에서 자세히 그린 테이블은 `id`만 적고 "참고"로 표시했습니다.
- 복합 UNIQUE, CHECK 제약은 Mermaid로 표현할 수 없어서 컬럼 설명에 적었습니다.

---

## 1. 전체 관계도

테이블 사이의 관계만 표시합니다. `member_withdrawal`(탈퇴자 보관)은 FK가 없는 독립 테이블이라 여기에는 나오지 않습니다.

```mermaid
erDiagram
    member ||--o{ member_agreement : ""
    member ||--o{ member_game_profile : ""
    member ||--o{ password_reset_token : ""
    member ||--o{ refresh_token : ""
    member ||--o{ activity_point_log : ""

    category ||--o{ game : ""
    game ||--o{ game_content : ""
    game ||--o{ member_game_profile : ""

    member ||--o{ post : "작성"
    category ||--o{ post : ""
    game ||--o{ post : ""
    game_content |o--o{ post : ""
    post ||--o{ post_tag : ""
    tag ||--o{ post_tag : ""
    member ||--o| post_draft : ""
    member ||--o{ post_scrap : ""
    post ||--o{ post_scrap : ""
    post ||--o{ post_application : ""
    member ||--o{ post_application : "신청"

    post ||--o{ comment : ""
    member ||--o{ comment : "작성"
    comment |o--o{ comment : "대댓글"

    post ||--o{ review : ""
    member ||--o{ review : "평가자"
    member ||--o{ review : "평가 대상"
    review ||--o{ review_tag_map : ""
    review_tag ||--o{ review_tag_map : ""
    member ||--o{ favorite_member : "즐겨찾기함"
    member ||--o{ favorite_member : "즐겨찾기됨"

    member ||--o{ notification : ""
    post |o--o{ notification : ""
    member ||--o{ notification_subscription : ""
    game ||--o{ notification_subscription : ""
    game_content |o--o{ notification_subscription : ""

    member ||--o{ report : "신고자"
    member ||--o{ report : "피신고자"
    post |o--o{ report : ""
    member ||--o{ sanction : ""
    report |o--o| sanction : ""
    admin_account |o--o{ report : "처리"
    admin_account ||--o{ sanction : "제재"
    admin_account |o--o{ sanction : "해제"
    admin_account ||--o{ admin_action_log : ""
    admin_account |o--o{ post : "관리자 삭제"
```

---

## 2. 도메인별 ERD

### 2.1 회원 · 인증

```mermaid
erDiagram
    member ||--o{ member_agreement : "약관 동의"
    member ||--o{ member_game_profile : "게이머 프로필"
    game ||--o{ member_game_profile : "대상 게임"
    member ||--o{ password_reset_token : "비밀번호 재설정"
    member ||--o{ refresh_token : "로그인 유지"
    member ||--o{ activity_point_log : "활동 점수"

    member {
        bigint id PK
        varchar(20) login_id UK "영문 소문자·숫자 4~20자, 탈퇴 시 NULL"
        varchar(100) password_hash "BCrypt"
        varchar(10) nickname UK "탈퇴 시 NULL"
        varchar(100) email UK "탈퇴 시 NULL"
        varchar(20) phone UK "하이픈 없이 저장"
        varchar(50) name "선택 입력"
        varchar(10) age_range
        boolean age_range_public "기본 TRUE"
        varchar(200) bio
        varchar(500) avatar_url
        varchar(20) status "ACTIVE / WARNED / SUSPENDED / BANNED / WITHDRAWN"
        datetime suspended_until
        decimal manner_temp "DECIMAL(4,1), 기본 36.5, 범위 0.0~99.9"
        int review_count "기본 0"
        int activity_point "누적 활동 점수, 기본 0"
        smallint level "서비스 활동 레벨 1~99, 기본 1"
        tinyint login_fail_count "기본 0"
        datetime locked_until
        datetime last_login_at
        datetime withdrawn_at "소프트 삭제 시각"
    }

    member_agreement {
        bigint member_id PK, FK
        varchar(20) agreement_type PK "TERMS / PRIVACY / MARKETING"
        varchar(20) terms_version
        boolean agreed
        datetime agreed_at
    }

    member_game_profile {
        bigint id PK
        bigint member_id FK "UQ(member_id, game_id)"
        bigint game_id FK
        boolean is_main "대표 게임"
        varchar(30) character_name
        json character_info "게임별 캐릭터 레벨, 티어 등"
        varchar(50) play_time_slot
        varchar(20) play_style
    }

    game {
        bigint id PK "2.2 참고"
    }

    password_reset_token {
        bigint id PK
        bigint member_id FK
        char(64) token_hash UK
        datetime expires_at
        datetime used_at
    }

    refresh_token {
        bigint id PK
        bigint member_id FK
        char(64) token_hash UK
        datetime expires_at
        datetime revoked_at
    }

    activity_point_log {
        bigint id PK
        bigint member_id FK "UQ(member_id, action_type, ref_id)"
        varchar(30) action_type "POST_CREATE / COMMENT_CREATE / REVIEW_WRITE / PARTY_COMPLETE / POST_REVOKE / COMMENT_REVOKE"
        bigint ref_id "FK 없음. post / comment / review의 id"
        int point "지급은 양수, 회수는 음수 (signed)"
    }

    member_withdrawal {
        bigint id PK
        bigint member_id "FK 없음, 보관용 사본"
        char(64) phone_hash "SHA-256"
        char(64) email_hash "SHA-256"
        varchar(200) reason
        boolean had_sanction
        datetime rejoin_blocked_until "NULL이면 제한 없음"
        datetime purge_at "파기 예정일"
        datetime withdrawn_at
    }
```

### 2.2 마스터 · 공고 · 파티

```mermaid
erDiagram
    category ||--o{ game : "장르"
    game ||--o{ game_content : "레이드, 던전"
    category ||--o{ post : "장르 (중복 저장)"
    game ||--o{ post : "게임"
    game_content |o--o{ post : "세부 콘텐츠"
    member ||--o{ post : "작성"
    admin_account |o--o{ post : "관리자 삭제"
    post ||--o{ post_tag : ""
    tag ||--o{ post_tag : ""
    member ||--o| post_draft : "임시저장"
    member ||--o{ post_scrap : "스크랩"
    post ||--o{ post_scrap : "스크랩됨"
    post ||--o{ post_application : "신청 받음"
    member ||--o{ post_application : "신청"

    category {
        varchar(20) code PK "mmorpg, fps ..."
        varchar(30) name
        int sort_order
        boolean is_active
    }

    game {
        bigint id PK
        varchar(20) category_code FK
        varchar(30) code UK "lostark ..."
        varchar(50) name
        int sort_order
        boolean is_active
    }

    game_content {
        bigint id PK
        bigint game_id FK "UQ(game_id, code)"
        varchar(20) content_type "RANK / NORMAL / DUNGEON / RAID"
        varchar(30) code "kamen ..."
        varchar(50) name
        tinyint max_headcount "파티장 포함 최대 모집 인원 2~16"
    }

    tag {
        bigint id PK
        varchar(20) name UK
    }

    post {
        bigint id PK
        bigint author_id FK
        varchar(20) category_code FK
        bigint game_id FK
        bigint game_content_id FK "NULL 허용"
        varchar(20) party_type
        varchar(100) title "2~100자"
        text body "마크다운"
        varchar(30) party_name
        varchar(20) play_style
        varchar(200) required_spec
        tinyint headcount "파티장 포함 정원, 2~16"
        tinyint current_count "파티장 포함, 기본 1"
        datetime schedule_at "NULL이면 시간 미정"
        boolean voice_required "기본 FALSE"
        varchar(20) status "OPEN / CLOSED / COMPLETED / DELETED"
        int view_count "기본 0"
        int comment_count "기본 0"
        datetime deleted_at
        bigint deleted_by_admin_id FK "NULL 허용"
        varchar(200) delete_reason
    }

    post_tag {
        bigint post_id PK, FK
        bigint tag_id PK, FK
    }

    post_draft {
        bigint id PK
        bigint member_id FK, UK "회원당 1개"
        json payload
    }

    post_scrap {
        bigint member_id PK, FK
        bigint post_id PK, FK
    }

    post_application {
        bigint id PK
        bigint post_id FK "UQ(post_id, applicant_id)"
        bigint applicant_id FK
        varchar(30) role "포지션"
        varchar(200) message
        varchar(20) status "PENDING / ACCEPTED / REJECTED / CANCELED / NO_SHOW"
        boolean late_cancel "기본 FALSE"
        datetime decided_at
        datetime canceled_at
    }

    member {
        bigint id PK "2.1 참고"
    }

    admin_account {
        bigint id PK "2.5 참고"
    }
```

### 2.3 댓글 · 평가 · 즐겨찾기

```mermaid
erDiagram
    post ||--o{ comment : "댓글"
    member ||--o{ comment : "작성"
    comment |o--o{ comment : "대댓글 (1단계)"
    post ||--o{ review : "파티 평가"
    member ||--o{ review : "평가자 (reviewer_id)"
    member ||--o{ review : "평가 대상 (target_id)"
    review ||--o{ review_tag_map : ""
    review_tag ||--o{ review_tag_map : ""
    member ||--o{ favorite_member : "즐겨찾기함 (member_id)"
    member ||--o{ favorite_member : "즐겨찾기됨 (target_member_id)"

    comment {
        bigint id PK
        bigint post_id FK
        bigint author_id FK
        bigint parent_id FK "NULL이면 루트 댓글"
        varchar(500) content
        boolean is_secret "비밀 댓글"
        varchar(20) status "VISIBLE / HIDDEN / DELETED"
        int report_count "기본 0, 5 이상이면 HIDDEN"
        datetime deleted_at
    }

    review {
        bigint id PK
        bigint post_id FK "UQ(post_id, reviewer_id, target_id)"
        bigint reviewer_id FK
        bigint target_id FK "CHECK reviewer_id != target_id"
        tinyint rating "CHECK 1~5"
        varchar(500) comment "한 줄 평"
    }

    review_tag {
        bigint id PK
        varchar(30) code UK "on-time ..."
        varchar(30) label "#시간엄수 ..."
        int sort_order
        boolean is_active
    }

    review_tag_map {
        bigint review_id PK, FK
        bigint review_tag_id PK, FK
    }

    favorite_member {
        bigint member_id PK, FK
        bigint target_member_id PK, FK "자기 자신 불가 (애플리케이션 검증)"
    }

    post {
        bigint id PK "2.2 참고"
    }

    member {
        bigint id PK "2.1 참고"
    }
```

### 2.4 알림

```mermaid
erDiagram
    member ||--o{ notification : "알림함"
    post |o--o{ notification : "관련 공고"
    member ||--o{ notification_subscription : "관심 알림"
    game ||--o{ notification_subscription : "관심 게임"
    game_content |o--o{ notification_subscription : "관심 레이드"

    notification {
        bigint id PK
        bigint member_id FK
        varchar(30) type "APPLICATION_RESULT / POST_UPDATED / INTEREST_POST / POST_DELETED / SANCTION"
        varchar(200) message
        bigint post_id FK "NULL 허용"
        boolean is_read
    }

    notification_subscription {
        bigint id PK
        bigint member_id FK "UQ(member_id, game_id, game_content_id)"
        bigint game_id FK
        bigint game_content_id FK "NULL 허용"
        boolean enabled
    }

    member {
        bigint id PK "2.1 참고"
    }

    post {
        bigint id PK "2.2 참고"
    }

    game {
        bigint id PK "2.2 참고"
    }

    game_content {
        bigint id PK "2.2 참고"
    }
```

### 2.5 신고 · 관리

```mermaid
erDiagram
    member ||--o{ report : "신고자 (reporter_id)"
    member ||--o{ report : "피신고 회원 (target_member_id)"
    post |o--o{ report : "관련 공고"
    admin_account |o--o{ report : "처리 (handled_by)"
    member ||--o{ sanction : "제재 대상"
    report |o--o| sanction : "근거 신고"
    admin_account ||--o{ sanction : "제재 (admin_id)"
    admin_account |o--o{ sanction : "해제 (released_by)"
    admin_account ||--o{ admin_action_log : "처리 이력"

    report {
        bigint id PK
        bigint reporter_id FK "UQ(reporter_id, target_type, target_id)"
        varchar(20) target_type "MEMBER / NO_SHOW / POST / COMMENT"
        bigint target_id "FK 없음. member / post_application / post / comment의 id"
        bigint target_member_id FK
        bigint post_id FK "NULL 허용"
        varchar(30) reason_code
        varchar(500) detail
        varchar(20) status
        varchar(30) action
        varchar(500) admin_memo
        bigint handled_by FK
        datetime handled_at
    }

    sanction {
        bigint id PK
        bigint member_id FK
        varchar(20) type "WARNING / SUSPEND / BAN"
        varchar(500) reason
        datetime starts_at
        datetime ends_at "NULL이면 영구 정지"
        bigint report_id FK "NULL 허용"
        bigint admin_id FK
        datetime released_at
        bigint released_by FK
        varchar(200) release_reason
    }

    admin_account {
        bigint id PK
        varchar(20) login_id UK
        varchar(100) password_hash
        varchar(50) name
        varchar(20) role "기본 ADMIN"
        varchar(20) status "기본 ACTIVE"
        datetime last_login_at
    }

    admin_action_log {
        bigint id PK
        bigint admin_id FK
        varchar(30) action_type
        varchar(20) target_type
        bigint target_id "FK 없음"
        json detail
        varchar(45) ip
    }

    member {
        bigint id PK "2.1 참고"
    }

    post {
        bigint id PK "2.2 참고"
    }
```

---

## 3. FK 목록과 삭제 동작

03 문서 [3. 관계](./03-db-design.md#3-관계)의 ON DELETE 규칙을 FK 단위로 풀어 쓴 표입니다.
원칙은 세 가지입니다. 마스터 데이터(category·game·game_content·tag·review_tag)와 보존할 기록은 RESTRICT, 회원에게만 딸린 데이터는 CASCADE입니다. 알림의 공고 링크처럼 없어도 되는 참조는 SET NULL입니다.

| 자식 테이블.컬럼 | 부모 | 관계 | ON DELETE |
| --- | --- | --- | --- |
| member_agreement.member_id | member | 1:N | CASCADE |
| member_game_profile.member_id | member | 1:N | CASCADE |
| member_game_profile.game_id | game | 1:N | RESTRICT |
| password_reset_token.member_id | member | 1:N | CASCADE |
| refresh_token.member_id | member | 1:N | CASCADE |
| activity_point_log.member_id | member | 1:N | CASCADE |
| game.category_code | category | 1:N | RESTRICT |
| game_content.game_id | game | 1:N | RESTRICT |
| post.author_id | member | 1:N | RESTRICT |
| post.category_code | category | 1:N | RESTRICT |
| post.game_id | game | 1:N | RESTRICT |
| post.game_content_id | game_content | 0..1:N | RESTRICT |
| post.deleted_by_admin_id | admin_account | 0..1:N | RESTRICT |
| post_tag.post_id | post | 1:N | CASCADE |
| post_tag.tag_id | tag | 1:N | RESTRICT |
| post_draft.member_id | member | 1:0..1 | CASCADE |
| post_scrap.member_id | member | 1:N | CASCADE |
| post_scrap.post_id | post | 1:N | CASCADE |
| post_application.post_id | post | 1:N | RESTRICT |
| post_application.applicant_id | member | 1:N | RESTRICT |
| comment.post_id | post | 1:N | RESTRICT |
| comment.author_id | member | 1:N | RESTRICT |
| comment.parent_id | comment | 0..1:N | RESTRICT |
| review.post_id | post | 1:N | RESTRICT |
| review.reviewer_id | member | 1:N | RESTRICT |
| review.target_id | member | 1:N | RESTRICT |
| review_tag_map.review_id | review | 1:N | CASCADE |
| review_tag_map.review_tag_id | review_tag | 1:N | RESTRICT |
| favorite_member.member_id | member | 1:N | CASCADE |
| favorite_member.target_member_id | member | 1:N | CASCADE |
| notification.member_id | member | 1:N | CASCADE |
| notification.post_id | post | 0..1:N | SET NULL |
| notification_subscription.member_id | member | 1:N | CASCADE |
| notification_subscription.game_id | game | 1:N | RESTRICT |
| notification_subscription.game_content_id | game_content | 0..1:N | RESTRICT |
| report.reporter_id | member | 1:N | RESTRICT |
| report.target_member_id | member | 1:N | RESTRICT |
| report.post_id | post | 0..1:N | RESTRICT |
| report.handled_by | admin_account | 0..1:N | RESTRICT |
| sanction.member_id | member | 1:N | RESTRICT |
| sanction.report_id | report | 0..1:0..1 | SET NULL |
| sanction.admin_id | admin_account | 1:N | RESTRICT |
| sanction.released_by | admin_account | 0..1:N | RESTRICT |
| admin_action_log.admin_id | admin_account | 1:N | RESTRICT |

### FK를 걸지 않는 참조

| 컬럼 | 이유 |
| --- | --- |
| report.target_id | 대상이 회원·신청(노쇼)·공고·댓글 등 여러 테이블이라 하나의 FK로 걸 수 없습니다. 신고당한 회원은 target_member_id에 따로 저장합니다. |
| admin_action_log.target_id | 같은 이유. 이력은 대상이 지워져도 남아야 합니다. |
| activity_point_log.ref_id | 근거가 공고·댓글·리뷰 중 하나라 하나의 FK로 걸 수 없습니다. 근거 글이 삭제돼도 점수 이력은 남아야 합니다. |
| member_withdrawal.member_id | 보관용 사본이라 원본 회원 행과 독립적으로 파기 일정을 가져갑니다. |
