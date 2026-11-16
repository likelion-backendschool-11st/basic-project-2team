-- =====================================================================
-- OurParty 팀 공용 시드 데이터 (로컬 개발·발표 시연용)
--
-- 실행 순서 : db/create-app-user.sql → db/schema.sql → db/seed.sql
--   mysql -u begg -p beggdb < db/seed.sql
--
-- 1) 기준 데이터(장르·게임·콘텐츠·태그·매너 태그): INSERT IGNORE 라 여러 번 실행해도 안전합니다.
-- 2) 시연 데이터(데모 회원 3명 + 공고 1개 + 댓글·답글): 빈 DB 에서 한 번만 실행하세요.
--    시연을 처음부터 다시 하려면 데모 계정의 공고·댓글을 지운 뒤 다시 실행합니다.
--
-- 데모 계정 비밀번호는 모두 abc123!@ (개발용. 운영 DB 에는 절대 넣지 마세요)
--   demohost   데모공대장  공고 작성자
--   demoasker  데모질문자  공고에 질문(댓글)을 남기는 사람 → 답글을 채택하는 사람
--   demohelper 데모답변자  질문에 답글(답변)을 다는 사람
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. 기준 데이터 (공용 개발 DB 에서 추출)
-- ---------------------------------------------------------------------
-- category (5건)
INSERT IGNORE INTO category (code, name, sort_order, is_active) VALUES
  ('mmorpg', 'MMORPG', 1, 1),
  ('fps', 'FPS', 2, 1),
  ('aos', 'AOS/MOBA', 3, 1),
  ('steam', '스팀', 4, 1),
  ('etc', '기타', 5, 1);

-- game (14건)
INSERT IGNORE INTO game (id, category_code, code, name, sort_order, is_active) VALUES
  (1, 'mmorpg', 'lostark', '로스트아크', 1, 1),
  (2, 'fps', 'valorant', '발로란트', 2, 1),
  (3, 'aos', 'lol', '리그 오브 레전드', 3, 1),
  (4, 'fps', 'overwatch', '오버워치 2', 4, 1),
  (6, 'mmorpg', 'maplestory', '메이플스토리', 5, 1),
  (7, 'mmorpg', 'ff14', '파이널 판타지 14', 6, 1),
  (8, 'mmorpg', 'wow', '월드 오브 워크래프트', 7, 1),
  (9, 'fps', 'pubg', '배틀그라운드', 8, 1),
  (10, 'fps', 'apex', '에이펙스 레전드', 9, 1),
  (11, 'aos', 'tft', '전략적 팀 전투', 10, 1),
  (12, 'aos', 'dota2', '도타 2', 11, 1),
  (13, 'steam', 'helldivers2', '헬다이버즈 2', 12, 1),
  (14, 'steam', 'monsterhunter', '몬스터 헌터', 13, 1),
  (15, 'etc', 'minecraft', '마인크래프트', 14, 1);

-- game_content (40건)
INSERT IGNORE INTO game_content (id, game_id, content_type, code, name, max_headcount) VALUES
  (1, 1, 'RAID', 'kamen', '어둠군단장 카멘', 8),
  (2, 1, 'RAID', 'echidna', '에키드나', 8),
  (3, 1, 'RAID', 'illiakan', '일리아칸', 8),
  (5, 4, 'RANK', 'competitive', '경쟁전', 5),
  (6, 2, 'RANK', 'competitive', '경쟁전', 5),
  (8, 3, 'RANK', 'ranked', '랭크 게임', 2),
  (9, 1, 'DUNGEON', 'abyss-dungeon', '어비스 던전', 4),
  (10, 6, 'RAID', 'lucid', '루시드', 6),
  (11, 6, 'RAID', 'will', '윌', 6),
  (12, 6, 'RAID', 'jin-hilla', '진 힐라', 6),
  (13, 6, 'DUNGEON', 'party-quest', '파티 퀘스트', 6),
  (14, 7, 'RAID', 'ultimate', '절 레이드', 8),
  (15, 7, 'RAID', 'savage', '영식 레이드', 8),
  (16, 7, 'DUNGEON', 'high-end-dungeon', '하이엔드 던전', 4),
  (17, 8, 'RAID', 'heroic-raid', '공격대 (영웅)', 16),
  (18, 8, 'DUNGEON', 'mythic-plus', '쐐기 던전', 5),
  (19, 2, 'NORMAL', 'unrated', '일반전', 5),
  (20, 9, 'RANK', 'ranked', '랭크전', 4),
  (21, 9, 'NORMAL', 'normal', '일반전', 4),
  (22, 10, 'RANK', 'ranked', '랭크', 3),
  (23, 3, 'RANK', 'flex', '자유 랭크', 5),
  (24, 11, 'RANK', 'ranked', '랭크', 2),
  (25, 12, 'RANK', 'ranked', '랭크', 5),
  (26, 13, 'DUNGEON', 'mission', '미션', 4),
  (27, 14, 'RAID', 'elder', '강적 토벌', 4),
  (28, 15, 'DUNGEON', 'adventure', '모험 · 던전 탐험', 16),
  (29, 2, 'NORMAL', 'spike-rush', '스파이크 러시', 5),
  (30, 2, 'NORMAL', 'deathmatch', '팀 데스매치', 5),
  (31, 4, 'NORMAL', 'quick-play', '빠른 대전', 5),
  (32, 4, 'NORMAL', 'arcade', '아케이드', 5),
  (33, 3, 'NORMAL', 'normal', '일반 게임', 5),
  (34, 3, 'NORMAL', 'aram', '칼바람 나락', 5),
  (35, 3, 'NORMAL', 'arena', '아레나', 2),
  (36, 9, 'NORMAL', 'arcade', '아케이드', 4),
  (37, 10, 'NORMAL', 'normal', '일반 (트리오)', 3),
  (38, 10, 'NORMAL', 'mixtape', '믹스테이프', 3),
  (39, 11, 'NORMAL', 'normal', '일반 게임', 2),
  (40, 11, 'NORMAL', 'double-up', '더블 업', 2),
  (41, 12, 'NORMAL', 'normal', '일반 게임', 5),
  (42, 12, 'NORMAL', 'turbo', '터보', 5);

-- tag (40건)
INSERT IGNORE INTO tag (id, name) VALUES
  (2, '디코필수'),
  (5, '골드'),
  (12, '숙련'),
  (14, '경쟁전'),
  (15, '즐겜'),
  (16, '레이드'),
  (19, '트라이'),
  (20, '초보환영'),
  (21, '고정팟'),
  (22, '힐러급구'),
  (23, '친절'),
  (25, '원클'),
  (27, '5인큐'),
  (29, '듀오'),
  (32, '자유랭크'),
  (34, '플래티넘'),
  (36, '매너'),
  (38, '아레나'),
  (41, '디코'),
  (43, '루시드'),
  (45, '윌'),
  (48, '파퀘'),
  (49, '영식'),
  (52, '던전'),
  (54, '쐐기'),
  (55, '탱커급구'),
  (56, '길드무관'),
  (58, '스쿼드'),
  (59, '마이크'),
  (61, '랭크'),
  (66, '협동'),
  (67, '고난이도'),
  (68, '토벌'),
  (70, '건축'),
  (71, '장기'),
  (72, '원래태그'),
  (73, '공통'),
  (74, '새태그'),
  (76, 'a'),
  (77, 'b');

-- review_tag (8건)
INSERT IGNORE INTO review_tag (id, code, label, sort_order, is_active) VALUES
  (5, 'on-time', '#시간엄수', 10, 1),
  (6, 'kind', '#친절함', 20, 1),
  (7, 'mental', '#멘탈갑', 30, 1),
  (8, 'skilled', '#높은숙련도', 40, 1),
  (9, 'order', '#오더장인', 50, 1),
  (10, 'briefing', '#브리핑장인', 60, 1),
  (11, 'feedback', '#피드백수용', 70, 1),
  (12, 'fun', '#즐겜매너', 80, 1);

-- ---------------------------------------------------------------------
-- 2. 시연 데이터
-- ---------------------------------------------------------------------
INSERT INTO member (login_id, password_hash, nickname, email) VALUES
  ('demohost',   '$2b$10$xrn9YwaZmIlFWCVgppdbaeRwa/NwBrwu3nVqwkbfcDiuaEjyLD2gK', '데모공대장', 'demohost@example.com'),
  ('demoasker',  '$2b$10$xrn9YwaZmIlFWCVgppdbaeRwa/NwBrwu3nVqwkbfcDiuaEjyLD2gK', '데모질문자', 'demoasker@example.com'),
  ('demohelper', '$2b$10$xrn9YwaZmIlFWCVgppdbaeRwa/NwBrwu3nVqwkbfcDiuaEjyLD2gK', '데모답변자', 'demohelper@example.com')
ON DUPLICATE KEY UPDATE login_id = login_id;

SELECT id INTO @host   FROM member WHERE login_id = 'demohost';
SELECT id INTO @asker  FROM member WHERE login_id = 'demoasker';
SELECT id INTO @helper FROM member WHERE login_id = 'demohelper';

-- 공고 (마크다운 본문)
INSERT INTO post (author_id, category_code, game_id, game_content_id, party_type, title, body, party_name, play_style, headcount, current_count, voice_required, status, comment_count)
VALUES (@host, 'mmorpg', 1, 1, 'raid', '카멘 1-3관 같이 가실 분 (숙련 환영)',
'# 카멘 1-3관 모집
**딜러 2명, 서포터 1명**을 모십니다. ~~초보 거절~~ 처음이어도 공략만 보고 오시면 환영합니다.

## 조건
- 아이템 레벨 1620 이상
- 디스코드 필수
- 시간 엄수 (21:00 시작)

> 트라이는 3번까지만 합니다.

공략 링크: [카멘 공략](https://example.com)',
'카멘 숙련팟', 'newbie', 4, 1, TRUE, 'OPEN', 3);

SET @post = LAST_INSERT_ID();

-- 질문(루트 댓글) 1개 + 답변(답글) 2개. 채택은 시연 중에 데모질문자 계정으로 직접 합니다.
INSERT INTO comment (post_id, author_id, parent_id, content) VALUES (@post, @asker, NULL, '서포터는 어떤 직업이 필요한가요? 홀리나이트도 괜찮을까요?');
SET @question = LAST_INSERT_ID();
INSERT INTO comment (post_id, author_id, parent_id, content) VALUES
  (@post, @helper, @question, '카멘은 힐 부담이 커서 바드나 도화가가 가장 무난해요. 홀리나이트도 가능하지만 생존기 타이밍을 맞춰야 합니다.'),
  (@post, @host,   @question, '홀리나이트 환영입니다! 1관문 전에 디코에서 패턴만 한 번 맞춰 봐요.');
