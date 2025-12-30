-- 태그 관련 테이블 생성
-- 
-- 사용 방법:
-- 1. 먼저 check_table_types.sql을 실행하여 posts.id의 실제 타입을 확인하세요
-- 2. 확인된 타입에 따라 적절한 스크립트를 선택:
--    - INT인 경우: 이 스크립트 사용 (아래 post_id를 INT로)
--    - BIGINT인 경우: create_tags_tables_bigint.sql 사용

-- tags 테이블 생성
CREATE TABLE IF NOT EXISTS tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- post_tags 테이블 생성 (게시글과 태그의 다대다 관계)
-- posts.id가 INT인 경우 (가장 일반적)
CREATE TABLE IF NOT EXISTS post_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    tag_id BIGINT NOT NULL,
    UNIQUE KEY unique_post_tag (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
