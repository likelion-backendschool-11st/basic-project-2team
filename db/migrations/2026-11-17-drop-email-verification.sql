-- 이메일 인증 제거 정리: 회원가입·아이디/비밀번호 찾기를 이메일 인증 없이 입력 정보 일치 확인으로 바꾸면서(#33)
-- schema.sql 과 코드에서는 email_verification 을 지웠지만, 그 전에 만든 DB 에는 테이블이 남아 있어 지웁니다.
-- 이 테이블을 참조하는 FK 는 없습니다. db/schema.sql 로 새로 만든 DB 에는 처음부터 없으므로 실행하지 않아도 됩니다.
DROP TABLE IF EXISTS email_verification;
