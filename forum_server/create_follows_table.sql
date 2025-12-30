-- 팔로우 관계 테이블 생성
-- 
-- 사용 방법:
-- 1. 먼저 check_table_types.sql을 실행하여 users.id의 실제 타입을 확인하세요
-- 2. 확인된 타입에 따라 적절한 스크립트를 선택:
--    - INT인 경우: 이 스크립트 사용 (아래 follower_id와 following_id를 INT로)
--    - BIGINT인 경우: create_follows_table_bigint.sql 사용

-- follows 테이블 생성
-- users.id가 INT인 경우 (가장 일반적)
CREATE TABLE IF NOT EXISTS follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    create_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follower_following (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
