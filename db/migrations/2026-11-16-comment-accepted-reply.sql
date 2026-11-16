-- 답글 채택: 댓글 작성자가 그 댓글에 달린 답글 하나를 「채택」하면 댓글(comment.accepted_reply_id)에 그 답글 id 를 저장합니다.
-- NULL 이면 채택 없음. 한 댓글에 채택된 답글은 하나뿐입니다.
-- 이미 만든 DB 에는 한 번만 실행하세요 (db/schema.sql 로 새로 만든 DB 에는 이미 들어 있습니다).
ALTER TABLE comment
  ADD COLUMN accepted_reply_id BIGINT UNSIGNED NULL COMMENT '이 댓글에 달린 답글 중 채택된 답글 id. NULL 이면 채택 없음. 댓글 작성자만 지정' AFTER parent_id,
  ADD CONSTRAINT fk_comment_accepted_reply FOREIGN KEY (accepted_reply_id) REFERENCES comment (id) ON DELETE SET NULL;
