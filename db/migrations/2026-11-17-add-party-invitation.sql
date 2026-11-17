-- =====================================================================
-- 2026-11-17 파티 초대 (party_invitation)
-- 이미 db/schema.sql 로 만든 로컬 DB 에 초대 테이블만 추가합니다. (schema.sql 에도 같은 정의가 있습니다)
--   mysql -u begg -p beggdb < db/migrations/2026-11-17-add-party-invitation.sql
-- =====================================================================

USE beggdb;

SET NAMES utf8mb4;

CREATE TABLE party_invitation (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id       BIGINT UNSIGNED NOT NULL,
  inviter_id    BIGINT UNSIGNED NOT NULL COMMENT '초대한 파티장(공고 작성자)',
  invitee_id    BIGINT UNSIGNED NOT NULL,
  status        VARCHAR(20)     NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / ACCEPTED / DECLINED',
  responded_at  DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_party_invitation UNIQUE (post_id, invitee_id),
  INDEX idx_party_invitation_invitee (invitee_id, status),
  CONSTRAINT fk_party_invitation_post    FOREIGN KEY (post_id)    REFERENCES post (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_party_invitation_inviter FOREIGN KEY (inviter_id) REFERENCES member (id) ON DELETE RESTRICT,
  CONSTRAINT fk_party_invitation_invitee FOREIGN KEY (invitee_id) REFERENCES member (id) ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '파티 초대 (수락하면 post_application 에 ACCEPTED 로 등록, 공고·회원당 1행)';
