-- 메시지 읽음 상태 테이블 생성
-- 테이블이 이미 존재하면 무시됨 (에러 발생 시 무시)

CREATE TABLE IF NOT EXISTS message_reads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_message_user (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES group_chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id)
);

-- GroupChatMessage에 읽음 수 카운트 컬럼 추가
-- 컬럼이 이미 존재하면 에러가 발생하지만 무시하고 진행
-- MySQL 5.7 이하 버전에서는 IF NOT EXISTS를 지원하지 않으므로
-- 에러가 발생해도 무시하고 진행하도록 처리

-- 방법 1: 동적 SQL 사용 (권장)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'group_chat_messages' 
    AND COLUMN_NAME = 'read_count'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE group_chat_messages ADD COLUMN read_count INT DEFAULT 0',
    'SELECT "Column read_count already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
