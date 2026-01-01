-- group_id 컬럼이 이미 BIGINT로 추가된 경우 INT로 변경하는 스크립트
-- 먼저 실행: check_user_groups_id_type.sql로 user_groups.id 타입 확인

-- 1. 기존 외래키 제약조건 삭제 (에러가 나면 무시하고 다음 단계로)
-- MySQL 버전에 따라 IF EXISTS를 지원하지 않을 수 있으므로, 
-- 에러가 발생하면 이미 삭제된 것이므로 무시하고 진행하세요
SET @dbname = DATABASE();
SET @tablename = 'posts';
SET @constraintname = 'fk_post_group';
SET @sql = CONCAT('ALTER TABLE ', @tablename, ' DROP FOREIGN KEY ', @constraintname);
SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
     WHERE CONSTRAINT_SCHEMA = @dbname 
     AND TABLE_NAME = @tablename 
     AND CONSTRAINT_NAME = @constraintname 
     AND CONSTRAINT_TYPE = 'FOREIGN KEY') > 0,
    @sql,
    'SELECT ''Foreign key does not exist, skipping...'' AS message'
) INTO @dropsql;
PREPARE stmt FROM @dropsql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 기존 인덱스 삭제 (에러가 나면 무시하고 다음 단계로)
SET @indexname = 'idx_posts_group_id';
SET @sql = CONCAT('DROP INDEX ', @indexname, ' ON ', @tablename);
SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = @dbname 
     AND TABLE_NAME = @tablename 
     AND INDEX_NAME = @indexname) > 0,
    @sql,
    'SELECT ''Index does not exist, skipping...'' AS message'
) INTO @dropsql;
PREPARE stmt FROM @dropsql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. group_id 컬럼 타입 변경 (BIGINT -> INT)
ALTER TABLE posts 
MODIFY COLUMN group_id INT NULL;

-- 4. 외래키 제약조건 다시 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 5. 인덱스 다시 추가
CREATE INDEX idx_posts_group_id ON posts(group_id);
