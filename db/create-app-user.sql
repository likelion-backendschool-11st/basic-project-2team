-- =====================================================================
-- OurParty 애플리케이션 전용 DB 계정 생성 (로컬 개발용)
--
-- root 같은 관리자 계정으로 먼저 실행한 뒤 schema.sql을 실행합니다.
--   mysql -u root -p < db/create-app-user.sql
--   mysql -u begg -p beggdb < db/schema.sql
--
-- ⚠️ 비밀번호 "begg"는 로컬 개발용입니다. 운영 서버에서는 강한 비밀번호를 쓰고,
--    이 파일 대신 환경 변수나 비밀 관리 도구로 주입하세요.
--    validate_password 컴포넌트가 켜져 있으면 짧은 비밀번호라 CREATE USER가 거부될 수 있습니다.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS beggdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

-- 같은 PC에서 접속하는 계정 (Spring Boot를 로컬에서 실행할 때)
CREATE USER IF NOT EXISTS 'begg'@'localhost' IDENTIFIED BY 'begg';

-- beggdb 안에서만 모든 권한 (테이블 생성·수정 포함). 다른 DB에는 접근할 수 없습니다.
GRANT ALL PRIVILEGES ON beggdb.* TO 'begg'@'localhost';

-- Docker 컨테이너 등 다른 호스트에서 접속해야 하면 아래 두 줄의 주석을 풀어 주세요.
-- CREATE USER IF NOT EXISTS 'begg'@'%' IDENTIFIED BY 'begg';
-- GRANT ALL PRIVILEGES ON beggdb.* TO 'begg'@'%';

FLUSH PRIVILEGES;
