-- group_post_tags 테이블 생성
-- 이미 테이블이 존재하면 생성하지 않음

SET @exist := (SELECT COUNT(*) FROM information_schema.TABLES
               WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'group_post_tags');

SET @sqlstmt := IF(@exist = 0,
    'CREATE TABLE group_post_tags (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        group_post_id BIGINT NOT NULL,
        tag_id BIGINT NOT NULL,
        UNIQUE KEY unique_group_post_tag (group_post_id, tag_id),
        FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        INDEX idx_group_post_id (group_post_id),
        INDEX idx_tag_id (tag_id)
    )',
    'SELECT "group_post_tags table already exists"');

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
