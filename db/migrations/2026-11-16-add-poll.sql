-- =====================================================================
-- 2026-11-16 파티 의견 조율 투표 (poll · poll_option · poll_vote)
-- 이미 db/schema.sql 로 만든 로컬 DB 에 투표 테이블만 추가합니다. (schema.sql 에도 같은 정의가 있습니다)
--   mysql -u begg -p beggdb < db/migrations/2026-11-16-add-poll.sql
-- =====================================================================

USE beggdb;

SET NAMES utf8mb4;

CREATE TABLE poll (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id          BIGINT UNSIGNED NOT NULL,
  author_id        BIGINT UNSIGNED NOT NULL COMMENT '만든 공대장(공고 작성자)',
  title            VARCHAR(40)     NOT NULL,
  description      VARCHAR(100)    NULL COMMENT '공대장 안내 문구',
  is_multiple      BOOLEAN         NOT NULL DEFAULT FALSE COMMENT '복수 선택',
  commenters_only  BOOLEAN         NOT NULL DEFAULT FALSE COMMENT '공고에 댓글을 남긴 공대원만 투표',
  is_pinned        BOOLEAN         NOT NULL DEFAULT TRUE COMMENT '상단 공지로 고정',
  closes_at        DATETIME        NOT NULL COMMENT '투표 마감 시각',
  final_option_id  BIGINT UNSIGNED NULL COMMENT 'FK 없음(poll_option 이 poll 을 참조). 확정한 항목',
  notice           VARCHAR(200)    NULL COMMENT '결과 확정 공지 메시지',
  closed_at        DATETIME        NULL COMMENT '공대장이 결과를 확정한 시각. NULL이면 미확정',
  reminded_at      DATETIME        NULL COMMENT '마지막 미투표자 알림 시각',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_poll_post (post_id, id),
  CONSTRAINT fk_poll_post   FOREIGN KEY (post_id)   REFERENCES post (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_poll_author FOREIGN KEY (author_id) REFERENCES member (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '파티 의견 조율 투표';

CREATE TABLE poll_option (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  poll_id     BIGINT UNSIGNED  NOT NULL,
  label       VARCHAR(30)      NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL COMMENT '1~5',
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_poll_option_poll (poll_id, sort_order),
  CONSTRAINT fk_poll_option_poll FOREIGN KEY (poll_id) REFERENCES poll (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '투표 항목 (2~5개)';

CREATE TABLE poll_vote (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  poll_id     BIGINT UNSIGNED NOT NULL COMMENT 'option_id 로 알 수 있지만 회원별 조회·삭제용으로 중복 저장',
  option_id   BIGINT UNSIGNED NOT NULL,
  member_id   BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_poll_vote UNIQUE (option_id, member_id),
  INDEX idx_poll_vote_poll_member (poll_id, member_id),
  CONSTRAINT fk_poll_vote_poll   FOREIGN KEY (poll_id)   REFERENCES poll (id)        ON DELETE CASCADE,
  CONSTRAINT fk_poll_vote_option FOREIGN KEY (option_id) REFERENCES poll_option (id) ON DELETE CASCADE,
  CONSTRAINT fk_poll_vote_member FOREIGN KEY (member_id) REFERENCES member (id)      ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '투표 기록 (복수 선택이면 회원당 여러 행)';
