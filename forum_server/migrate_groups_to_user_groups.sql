-- groups 테이블이 있는 경우 user_groups로 이름 변경
-- 이 스크립트는 groups 테이블이 이미 존재하는 경우에만 실행하세요

-- 1. groups 테이블이 존재하는지 확인하고 이름 변경
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'groups'
);

SET @sql = IF(@table_exists > 0,
    'RENAME TABLE `groups` TO `user_groups`;',
    'SELECT "groups table does not exist, skipping rename" AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 외래키 제약조건 확인 (필요시 수정)
-- group_members, group_posts, group_chat_rooms 테이블의 외래키는
-- 테이블 이름 변경 후에도 자동으로 업데이트됩니다.
