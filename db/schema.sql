-- =====================================================================
-- OurParty DB schema (MySQL 8.0.16+)
-- 기준 문서: docs/04-erd.md, docs/03-db-design.md
--
-- 실행 (create-app-user.sql 을 먼저 실행한 뒤):
--   mysql -u begg -p beggdb < db/schema.sql
--
-- 규칙
--   - InnoDB, utf8mb4 / utf8mb4_0900_ai_ci
--   - PK: BIGINT UNSIGNED AUTO_INCREMENT
--   - 시간: DATETIME, 애플리케이션에서 UTC로 저장
--   - 상태값: VARCHAR + Java enum (MySQL ENUM 사용 안 함)
--   - 테이블은 FK 참조 순서대로 생성합니다. 다시 만들려면 DB를 지우고 처음부터 실행하세요.
--   - FK 컬럼 중 별도 인덱스를 적지 않은 컬럼은 InnoDB가 FK 인덱스를 자동으로 만듭니다.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS beggdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE beggdb;

SET NAMES utf8mb4;

-- =====================================================================
-- 관리자 (다른 테이블이 참조하므로 먼저 생성)
-- =====================================================================

CREATE TABLE admin_account (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id       VARCHAR(20)     NOT NULL,
  password_hash  VARCHAR(100)    NOT NULL,
  name           VARCHAR(50)     NOT NULL,
  role           VARCHAR(20)     NOT NULL DEFAULT 'ADMIN',
  status         VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
  last_login_at  DATETIME        NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_admin_account_login_id UNIQUE (login_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '관리자 계정 (회원과 분리)';

-- =====================================================================
-- 회원
-- =====================================================================

CREATE TABLE member (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  login_id          VARCHAR(20)       NULL COMMENT '영문 소문자·숫자 4~20자. 탈퇴 시 NULL',
  password_hash     VARCHAR(100)      NULL COMMENT 'BCrypt',
  nickname          VARCHAR(10)       NULL COMMENT '2~10자. 탈퇴 시 NULL',
  email             VARCHAR(100)      NULL COMMENT '탈퇴 시 NULL',
  phone             VARCHAR(20)       NULL COMMENT '하이픈 없이 저장. 탈퇴 시 NULL',
  name              VARCHAR(50)       NULL COMMENT '선택 입력',
  age_range         VARCHAR(10)       NULL,
  age_range_public  BOOLEAN           NOT NULL DEFAULT TRUE,
  bio               VARCHAR(200)      NULL,
  avatar_url        VARCHAR(500)      NULL,
  status            VARCHAR(20)       NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / WARNED / SUSPENDED / BANNED / WITHDRAWN',
  suspended_until   DATETIME          NULL,
  manner_temp       DECIMAL(4,1)      NOT NULL DEFAULT 36.5,
  review_count      INT UNSIGNED      NOT NULL DEFAULT 0,
  activity_point    INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT '누적 활동 점수',
  level             SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '서비스 활동 레벨 1~99',
  login_fail_count  TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  locked_until      DATETIME          NULL,
  last_login_at     DATETIME          NULL,
  withdrawn_at      DATETIME          NULL COMMENT '소프트 삭제 시각',
  created_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_member_login_id UNIQUE (login_id),
  CONSTRAINT uq_member_nickname UNIQUE (nickname),
  CONSTRAINT uq_member_email    UNIQUE (email),
  CONSTRAINT uq_member_phone    UNIQUE (phone),
  INDEX idx_member_status_created     (status, created_at),
  INDEX idx_member_status_manner_temp (status, manner_temp),
  CONSTRAINT ck_member_manner_temp CHECK (manner_temp BETWEEN 0.0 AND 99.9),
  CONSTRAINT ck_member_level       CHECK (level BETWEEN 1 AND 99)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '회원 (소프트 삭제)';

CREATE TABLE member_agreement (
  member_id       BIGINT UNSIGNED NOT NULL,
  agreement_type  VARCHAR(20)     NOT NULL COMMENT 'TERMS / PRIVACY / MARKETING',
  terms_version   VARCHAR(20)     NOT NULL,
  agreed          BOOLEAN         NOT NULL,
  agreed_at       DATETIME        NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, agreement_type),
  CONSTRAINT fk_member_agreement_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '약관 동의 이력';

CREATE TABLE member_withdrawal (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id             BIGINT UNSIGNED NOT NULL COMMENT 'FK 없음. 보관용 사본',
  phone_hash            CHAR(64)        NULL COMMENT 'SHA-256',
  email_hash            CHAR(64)        NULL COMMENT 'SHA-256',
  reason                VARCHAR(200)    NULL,
  had_sanction          BOOLEAN         NOT NULL DEFAULT FALSE,
  rejoin_blocked_until  DATETIME        NULL COMMENT 'NULL이면 제한 없음',
  purge_at              DATETIME        NOT NULL COMMENT '파기 예정일',
  withdrawn_at          DATETIME        NOT NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_member_withdrawal_phone_hash (phone_hash),
  INDEX idx_member_withdrawal_email_hash (email_hash),
  INDEX idx_member_withdrawal_purge_at   (purge_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '탈퇴자 분리 보관';

CREATE TABLE activity_point_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id    BIGINT UNSIGNED NOT NULL,
  action_type  VARCHAR(30)     NOT NULL COMMENT 'POST_CREATE / COMMENT_CREATE / REVIEW_WRITE / PARTY_COMPLETE / POST_REVOKE / COMMENT_REVOKE',
  ref_id       BIGINT UNSIGNED NOT NULL COMMENT 'FK 없음. post / comment / review의 id',
  point        INT             NOT NULL COMMENT '지급은 양수, 회수는 음수',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_activity_point_log UNIQUE (member_id, action_type, ref_id),
  INDEX idx_activity_point_log_daily (member_id, action_type, created_at),
  CONSTRAINT fk_activity_point_log_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '활동 점수 이력 (추가만 함)';

-- =====================================================================
-- 인증
-- =====================================================================

CREATE TABLE password_reset_token (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id   BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  expires_at  DATETIME        NOT NULL,
  used_at     DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
  INDEX idx_password_reset_token_member (member_id),
  CONSTRAINT fk_password_reset_token_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '비밀번호 재설정 토큰';

CREATE TABLE refresh_token (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id   BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  expires_at  DATETIME        NOT NULL,
  revoked_at  DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
  INDEX idx_refresh_token_member (member_id),
  CONSTRAINT fk_refresh_token_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'JWT 리프레시 토큰';

-- =====================================================================
-- 마스터
-- =====================================================================

CREATE TABLE category (
  code        VARCHAR(20) NOT NULL COMMENT 'mmorpg / fps / aos / steam / etc',
  name        VARCHAR(30) NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '장르';

CREATE TABLE game (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_code  VARCHAR(20)     NOT NULL,
  code           VARCHAR(30)     NOT NULL COMMENT 'lostark ...',
  name           VARCHAR(50)     NOT NULL,
  sort_order     INT             NOT NULL DEFAULT 0,
  is_active      BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_game_code UNIQUE (code),
  CONSTRAINT fk_game_category FOREIGN KEY (category_code) REFERENCES category (code) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '게임';

CREATE TABLE game_content (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  game_id       BIGINT UNSIGNED NOT NULL,
  content_type  VARCHAR(20)     NOT NULL COMMENT 'RANK / NORMAL / DUNGEON / RAID',
  code          VARCHAR(30)     NOT NULL COMMENT 'kamen ...',
  name          VARCHAR(50)     NOT NULL,
  max_headcount TINYINT UNSIGNED NOT NULL DEFAULT 16 COMMENT '파티장 포함 최대 모집 인원 2~16',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_game_content_code UNIQUE (game_id, code),
  CONSTRAINT fk_game_content_game FOREIGN KEY (game_id) REFERENCES game (id) ON DELETE RESTRICT,
  CONSTRAINT ck_game_content_max_headcount CHECK (max_headcount BETWEEN 2 AND 16)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '레이드·던전 등 세부 콘텐츠';

CREATE TABLE tag (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(20)     NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_tag_name UNIQUE (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '공고 태그';

CREATE TABLE review_tag (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30)     NOT NULL COMMENT 'on-time ...',
  label       VARCHAR(30)     NOT NULL COMMENT '#시간엄수 ...',
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_review_tag_code UNIQUE (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '매너 평가 태그';

CREATE TABLE member_game_profile (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id       BIGINT UNSIGNED NOT NULL,
  game_id         BIGINT UNSIGNED NOT NULL,
  is_main         BOOLEAN         NOT NULL DEFAULT FALSE COMMENT '대표 게임',
  character_name  VARCHAR(30)     NULL,
  character_info  JSON            NULL COMMENT '게임별 캐릭터 레벨, 티어 등',
  play_time_slot  VARCHAR(50)     NULL COMMENT '자유 입력. 예: 평일 21-24',
  play_style      VARCHAR(20)     NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_member_game_profile UNIQUE (member_id, game_id),
  CONSTRAINT fk_member_game_profile_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
  CONSTRAINT fk_member_game_profile_game   FOREIGN KEY (game_id)   REFERENCES game (id)   ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '게이머 프로필';

-- =====================================================================
-- 공고 · 파티
-- =====================================================================

CREATE TABLE post (
  id                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  author_id            BIGINT UNSIGNED  NOT NULL,
  category_code        VARCHAR(20)      NOT NULL COMMENT 'game에서 알 수 있지만 목록 조회용으로 중복 저장',
  game_id              BIGINT UNSIGNED  NOT NULL,
  game_content_id      BIGINT UNSIGNED  NULL,
  party_type           VARCHAR(20)      NOT NULL,
  title                VARCHAR(100)     NOT NULL COMMENT '2~100자',
  body                 TEXT             NOT NULL COMMENT '마크다운',
  party_name           VARCHAR(30)      NULL,
  play_style           VARCHAR(20)      NULL,
  required_spec        VARCHAR(200)     NULL,
  headcount            TINYINT UNSIGNED NOT NULL COMMENT '파티장 포함 정원 2~16',
  current_count        TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '파티장 포함 현재 인원',
  schedule_at          DATETIME         NULL COMMENT 'NULL이면 시간 미정',
  voice_required       BOOLEAN          NOT NULL DEFAULT FALSE,
  status               VARCHAR(20)      NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN / PAUSED / CLOSED / COMPLETED / DELETED',
  view_count           INT UNSIGNED     NOT NULL DEFAULT 0,
  comment_count        INT UNSIGNED     NOT NULL DEFAULT 0,
  deleted_at           DATETIME         NULL,
  deleted_by_admin_id  BIGINT UNSIGNED  NULL,
  delete_reason        VARCHAR(200)     NULL,
  created_at           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_post_category_created  (category_code, created_at),
  INDEX idx_post_category_views    (category_code, view_count),
  INDEX idx_post_status_schedule   (status, schedule_at),
  INDEX idx_post_game_created      (game_id, created_at),
  INDEX idx_post_author_created    (author_id, created_at),
  FULLTEXT INDEX ftx_post_title_party_name (title, party_name) WITH PARSER ngram,
  CONSTRAINT fk_post_author       FOREIGN KEY (author_id)           REFERENCES member (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_post_category     FOREIGN KEY (category_code)       REFERENCES category (code)    ON DELETE RESTRICT,
  CONSTRAINT fk_post_game         FOREIGN KEY (game_id)             REFERENCES game (id)          ON DELETE RESTRICT,
  CONSTRAINT fk_post_game_content FOREIGN KEY (game_content_id)     REFERENCES game_content (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_post_deleted_by   FOREIGN KEY (deleted_by_admin_id) REFERENCES admin_account (id) ON DELETE RESTRICT,
  CONSTRAINT ck_post_headcount     CHECK (headcount BETWEEN 2 AND 16),
  CONSTRAINT ck_post_current_count CHECK (current_count BETWEEN 1 AND headcount)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '파티 모집 공고 (소프트 삭제)';

CREATE TABLE post_tag (
  post_id     BIGINT UNSIGNED NOT NULL,
  tag_id      BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, tag_id),
  INDEX idx_post_tag_tag_post (tag_id, post_id),
  CONSTRAINT fk_post_tag_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tag_tag  FOREIGN KEY (tag_id)  REFERENCES tag (id)  ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '공고-태그 연결 (공고당 최대 5개, 애플리케이션에서 검증)';

CREATE TABLE post_draft (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id   BIGINT UNSIGNED NOT NULL,
  payload     JSON            NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_post_draft_member UNIQUE (member_id),
  CONSTRAINT fk_post_draft_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '공고 임시저장 (회원당 1개)';

CREATE TABLE post_scrap (
  member_id   BIGINT UNSIGNED NOT NULL,
  post_id     BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, post_id),
  INDEX idx_post_scrap_post (post_id),
  CONSTRAINT fk_post_scrap_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
  CONSTRAINT fk_post_scrap_post   FOREIGN KEY (post_id)   REFERENCES post (id)   ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '공고 스크랩';

CREATE TABLE post_application (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id       BIGINT UNSIGNED NOT NULL,
  applicant_id  BIGINT UNSIGNED NOT NULL,
  role          VARCHAR(30)     NULL COMMENT '포지션',
  message       VARCHAR(200)    NULL,
  status        VARCHAR(20)     NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / ACCEPTED / REJECTED / CANCELED / NO_SHOW',
  late_cancel   BOOLEAN         NOT NULL DEFAULT FALSE,
  decided_at    DATETIME        NULL,
  canceled_at   DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_post_application UNIQUE (post_id, applicant_id),
  INDEX idx_post_application_applicant (applicant_id, status, created_at),
  CONSTRAINT fk_post_application_post      FOREIGN KEY (post_id)      REFERENCES post (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_post_application_applicant FOREIGN KEY (applicant_id) REFERENCES member (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '파티 신청 (ACCEPTED = 파티원)';

-- =====================================================================
-- 댓글 · 평가 · 즐겨찾기
-- =====================================================================

CREATE TABLE comment (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id       BIGINT UNSIGNED NOT NULL,
  author_id     BIGINT UNSIGNED NOT NULL,
  parent_id     BIGINT UNSIGNED NULL COMMENT 'NULL이면 루트 댓글. 깊이 1단계는 애플리케이션에서 검증',
  content       VARCHAR(500)    NOT NULL,
  is_secret     BOOLEAN         NOT NULL DEFAULT FALSE,
  status        VARCHAR(20)     NOT NULL DEFAULT 'VISIBLE' COMMENT 'VISIBLE / HIDDEN / DELETED',
  report_count  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '5 이상이면 HIDDEN',
  deleted_at    DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_comment_post_parent_created (post_id, parent_id, created_at),
  INDEX idx_comment_author_created      (author_id, created_at),
  INDEX idx_comment_status_created      (status, created_at),
  CONSTRAINT fk_comment_post   FOREIGN KEY (post_id)   REFERENCES post (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES member (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES comment (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '댓글·대댓글 (소프트 삭제)';

CREATE TABLE review (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  post_id      BIGINT UNSIGNED  NOT NULL,
  reviewer_id  BIGINT UNSIGNED  NOT NULL,
  target_id    BIGINT UNSIGNED  NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL,
  comment      VARCHAR(500)     NULL COMMENT '한 줄 평',
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_review UNIQUE (post_id, reviewer_id, target_id),
  INDEX idx_review_target_created (target_id, created_at),
  CONSTRAINT fk_review_post     FOREIGN KEY (post_id)     REFERENCES post (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES member (id) ON DELETE RESTRICT,
  CONSTRAINT fk_review_target   FOREIGN KEY (target_id)   REFERENCES member (id) ON DELETE RESTRICT,
  CONSTRAINT ck_review_rating   CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_review_not_self CHECK (reviewer_id <> target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '파티원 매너 평가';

CREATE TABLE review_tag_map (
  review_id      BIGINT UNSIGNED NOT NULL,
  review_tag_id  BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id, review_tag_id),
  INDEX idx_review_tag_map_tag (review_tag_id),
  CONSTRAINT fk_review_tag_map_review FOREIGN KEY (review_id)     REFERENCES review (id)     ON DELETE CASCADE,
  CONSTRAINT fk_review_tag_map_tag    FOREIGN KEY (review_tag_id) REFERENCES review_tag (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '평가-태그 연결';

-- MySQL은 ON DELETE CASCADE가 걸린 컬럼에 CHECK 제약을 함께 걸 수 없습니다.
-- 그래서 "자기 자신 즐겨찾기 불가"는 애플리케이션에서 검증합니다.
CREATE TABLE favorite_member (
  member_id         BIGINT UNSIGNED NOT NULL,
  target_member_id  BIGINT UNSIGNED NOT NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, target_member_id),
  INDEX idx_favorite_member_target (target_member_id),
  CONSTRAINT fk_favorite_member_member FOREIGN KEY (member_id)        REFERENCES member (id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_member_target FOREIGN KEY (target_member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '사용자 즐겨찾기';

-- =====================================================================
-- 알림
-- =====================================================================

CREATE TABLE notification (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id   BIGINT UNSIGNED NOT NULL,
  type        VARCHAR(30)     NOT NULL COMMENT 'APPLICATION_RECEIVED / APPLICATION_RESULT / APPLICATION_CANCELED / POST_UPDATED / INTEREST_POST / POST_DELETED / SANCTION',
  message     VARCHAR(200)    NOT NULL,
  post_id     BIGINT UNSIGNED NULL,
  is_read     BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notification_member_read_created (member_id, is_read, created_at),
  CONSTRAINT fk_notification_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_post   FOREIGN KEY (post_id)   REFERENCES post (id)   ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '알림함';

CREATE TABLE notification_subscription (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id        BIGINT UNSIGNED NOT NULL,
  game_id          BIGINT UNSIGNED NOT NULL,
  game_content_id  BIGINT UNSIGNED NULL COMMENT 'NULL이면 UNIQUE가 중복을 막지 못하므로 애플리케이션에서도 검사',
  enabled          BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_notification_subscription UNIQUE (member_id, game_id, game_content_id),
  INDEX idx_notification_subscription_target (game_id, game_content_id, enabled),
  CONSTRAINT fk_notification_subscription_member  FOREIGN KEY (member_id)       REFERENCES member (id)       ON DELETE CASCADE,
  CONSTRAINT fk_notification_subscription_game    FOREIGN KEY (game_id)         REFERENCES game (id)         ON DELETE RESTRICT,
  CONSTRAINT fk_notification_subscription_content FOREIGN KEY (game_content_id) REFERENCES game_content (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '관심 알림 설정';

-- =====================================================================
-- 신고 · 관리
-- =====================================================================

CREATE TABLE report (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id       BIGINT UNSIGNED NOT NULL,
  target_type       VARCHAR(20)     NOT NULL COMMENT 'MEMBER / NO_SHOW / POST / COMMENT',
  target_id         BIGINT UNSIGNED NOT NULL COMMENT 'FK 없음. member / post_application / post / comment의 id',
  target_member_id  BIGINT UNSIGNED NOT NULL,
  post_id           BIGINT UNSIGNED NULL,
  reason_code       VARCHAR(30)     NOT NULL,
  detail            VARCHAR(500)    NULL,
  status            VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
  action            VARCHAR(30)     NULL,
  admin_memo        VARCHAR(500)    NULL,
  handled_by        BIGINT UNSIGNED NULL,
  handled_at        DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_report UNIQUE (reporter_id, target_type, target_id),
  INDEX idx_report_status_created (status, created_at),
  INDEX idx_report_target         (target_type, target_id),
  INDEX idx_report_target_member  (target_member_id),
  CONSTRAINT fk_report_reporter      FOREIGN KEY (reporter_id)      REFERENCES member (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_report_target_member FOREIGN KEY (target_member_id) REFERENCES member (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_report_post          FOREIGN KEY (post_id)          REFERENCES post (id)          ON DELETE RESTRICT,
  CONSTRAINT fk_report_handled_by    FOREIGN KEY (handled_by)       REFERENCES admin_account (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '신고';

CREATE TABLE sanction (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id       BIGINT UNSIGNED NOT NULL,
  type            VARCHAR(20)     NOT NULL COMMENT 'WARNING / SUSPEND / BAN',
  reason          VARCHAR(500)    NOT NULL,
  starts_at       DATETIME        NOT NULL,
  ends_at         DATETIME        NULL COMMENT 'NULL이면 영구 정지',
  report_id       BIGINT UNSIGNED NULL,
  admin_id        BIGINT UNSIGNED NOT NULL,
  released_at     DATETIME        NULL,
  released_by     BIGINT UNSIGNED NULL,
  release_reason  VARCHAR(200)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sanction_member_created (member_id, created_at),
  INDEX idx_sanction_ends_at        (ends_at),
  CONSTRAINT fk_sanction_member      FOREIGN KEY (member_id)   REFERENCES member (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_sanction_report      FOREIGN KEY (report_id)   REFERENCES report (id)        ON DELETE SET NULL,
  CONSTRAINT fk_sanction_admin       FOREIGN KEY (admin_id)    REFERENCES admin_account (id) ON DELETE RESTRICT,
  CONSTRAINT fk_sanction_released_by FOREIGN KEY (released_by) REFERENCES admin_account (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '제재 (경고·정지)';

CREATE TABLE admin_action_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id     BIGINT UNSIGNED NOT NULL,
  action_type  VARCHAR(30)     NOT NULL,
  target_type  VARCHAR(20)     NULL,
  target_id    BIGINT UNSIGNED NULL COMMENT 'FK 없음',
  detail       JSON            NULL,
  ip           VARCHAR(45)     NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_admin_action_log_admin_created  (admin_id, created_at),
  INDEX idx_admin_action_log_action_created (action_type, created_at),
  INDEX idx_admin_action_log_target         (target_type, target_id),
  CONSTRAINT fk_admin_action_log_admin FOREIGN KEY (admin_id) REFERENCES admin_account (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '관리자 처리·접근 이력 (추가만 함)';
