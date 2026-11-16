-- 공고 작성 「상세 분류 → 직접 입력」: game_content 에 없는 상세 분류를 글자로 저장합니다.
-- game_content_id 가 NULL 이고 custom_detail 이 채워져 있으면 직접 입력한 공고입니다.
-- 이미 만든 DB 에는 한 번만 실행하세요 (db/schema.sql 로 새로 만든 DB 에는 이미 들어 있습니다).
ALTER TABLE post
  ADD COLUMN custom_detail VARCHAR(50) NULL COMMENT '상세 분류 직접 입력. game_content_id 와 함께 쓰지 않음' AFTER game_content_id;
