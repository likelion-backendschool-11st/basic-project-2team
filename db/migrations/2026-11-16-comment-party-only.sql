-- 참가자 전용 댓글: 참가가 확정된 파티원(공대장 + 승인된 파티원)만 보고 쓰는 댓글 채널.
-- is_party_only 가 TRUE 인 댓글은 공개 댓글 목록에 나오지 않고 공고 comment_count 에도 넣지 않습니다. 답글은 부모 댓글의 값을 따릅니다.
-- 목록이 (post_id, is_party_only, parent_id, created_at) 로 찾으므로 기존 인덱스를 채널을 포함한 인덱스로 바꿉니다.
-- 이미 만든 DB 에는 한 번만 실행하세요 (db/schema.sql 로 새로 만든 DB 에는 이미 들어 있습니다).
ALTER TABLE comment
  ADD COLUMN is_party_only BOOLEAN NOT NULL DEFAULT FALSE COMMENT '참가자 전용 댓글(공대장 + 승인된 파티원만 열람·작성). 답글은 부모를 따름. 공고 comment_count 에 넣지 않음' AFTER is_secret,
  ADD INDEX idx_comment_post_party_parent (post_id, is_party_only, parent_id, created_at),
  DROP INDEX idx_comment_post_parent_created;
