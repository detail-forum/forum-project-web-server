-- user_groups 테이블의 id 컬럼 타입 확인
-- 이 쿼리를 먼저 실행하여 실제 타입을 확인한 후 적절한 마이그레이션 스크립트를 선택하세요

SELECT 
    'user_groups' AS table_name,
    COLUMN_NAME,
    COLUMN_TYPE,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'user_groups' 
AND COLUMN_NAME = 'id';
