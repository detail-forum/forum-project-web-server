-- update_datetime 컬럼이 TIME 타입인 경우 DATETIME으로 변경
-- (만약 컬럼 타입이 TIME이라면 이 스크립트를 실행)

-- 1. 컬럼 타입 확인 (실행 전 확인용)
-- SHOW COLUMNS FROM posts WHERE Field = 'update_datetime';

-- 2. 컬럼 타입을 DATETIME으로 변경 (TIME 타입인 경우)
-- ALTER TABLE posts MODIFY COLUMN update_datetime DATETIME NULL;

-- 3. 기존 TIME 타입 데이터를 DATETIME으로 변환
-- UPDATE posts 
-- SET update_datetime = CONCAT(DATE(create_datetime), ' ', update_datetime)
-- WHERE update_datetime IS NOT NULL 
--    AND DATE(update_datetime) IS NULL
--    AND TIME(update_datetime) IS NOT NULL;

