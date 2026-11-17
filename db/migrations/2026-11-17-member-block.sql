-- 사용자 차단: 회원(member_id)이 다른 회원(target_member_id)을 차단하면, 차단당한 회원은 차단한 회원의 공고를
-- 목록·검색·메인·관련 공고·프로필에서 볼 수 없고 상세는 404 가 됩니다. 새 공고 알림도 받지 않습니다.
-- 이미 만든 DB 에는 한 번만 실행하세요 (db/schema.sql 로 새로 만든 DB 에는 이미 들어 있습니다).
CREATE TABLE member_block (
  member_id         BIGINT UNSIGNED NOT NULL COMMENT '차단한 회원',
  target_member_id  BIGINT UNSIGNED NOT NULL COMMENT '차단당한 회원. 차단한 회원의 공고를 볼 수 없음',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, target_member_id),
  INDEX idx_member_block_target (target_member_id),
  CONSTRAINT fk_member_block_member FOREIGN KEY (member_id)        REFERENCES member (id) ON DELETE CASCADE,
  CONSTRAINT fk_member_block_target FOREIGN KEY (target_member_id) REFERENCES member (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '사용자 차단';
