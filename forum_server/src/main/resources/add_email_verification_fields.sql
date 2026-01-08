-- 이메일 인증 필드 추가 마이그레이션
-- 실행 방법: MySQL에서 직접 실행하거나, Flyway/Liquibase 같은 마이그레이션 도구 사용

-- email_verified 필드 추가 (기본값: false)
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE 
AFTER github_link;

-- email_verification_token 필드 추가
ALTER TABLE users 
ADD COLUMN email_verification_token VARCHAR(255) NULL 
AFTER email_verified;

-- 기존 사용자들의 이메일 인증 상태를 false로 설정 (이미 가입한 사용자는 인증 필요)
UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL;

-- 인덱스 추가 (토큰 검색 성능 향상)
CREATE INDEX idx_email_verification_token ON users(email_verification_token);
