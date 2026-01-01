-- comments 테이블에 group_post_id 컬럼 추가 (안전한 버전)
-- 기존 데이터에 영향을 주지 않도록 NULL 허용

-- 1. comments 테이블에 group_post_id 컬럼 추가
ALTER TABLE comments 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- 2. post_likes 테이블에 group_post_id 컬럼 추가
ALTER TABLE post_likes 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- 3. 외래키 제약조건 추가 (IF NOT EXISTS는 MySQL 8.0.19+에서 지원)
-- 기존 제약조건이 있을 수 있으므로 먼저 확인 후 추가
SET @dbname = DATABASE();
SET @tablename = "comments";
SET @constraintname = "fk_comment_group_post";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (CONSTRAINT_NAME = @constraintname)
  ) > 0,
  "SELECT 'Constraint already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @constraintname, " FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @tablename = "post_likes";
SET @constraintname = "fk_post_like_group_post";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (CONSTRAINT_NAME = @constraintname)
  ) > 0,
  "SELECT 'Constraint already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @constraintname, " FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 4. 인덱스 추가 (IF NOT EXISTS는 MySQL 8.0.19+에서 지원)
CREATE INDEX IF NOT EXISTS idx_comments_group_post_id ON comments(group_post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_group_post_id ON post_likes(group_post_id);

-- 5. post_likes 테이블의 unique 제약조건 추가
-- 기존 unique 제약조건 확인 후 추가
SET @tablename = "post_likes";
SET @constraintname = "unique_group_post_user";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (CONSTRAINT_NAME = @constraintname)
  ) > 0,
  "SELECT 'Constraint already exists'",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @constraintname, " UNIQUE (group_post_id, user_id)")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
