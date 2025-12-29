-- 기존 게시글의 update_datetime이 null이거나 잘못된 값인 경우 수정
-- update_datetime이 null이거나 create_datetime과 같거나, 1970년 이전인 경우 create_datetime으로 설정

-- 1. 시간만 저장된 경우 (TIME 타입으로 저장된 경우) 처리
-- TIME 타입은 'HH:MM:SS' 형식으로만 저장되므로, create_datetime의 날짜와 결합
UPDATE posts 
SET update_datetime = CONCAT(DATE(create_datetime), ' ', TIME(update_datetime))
WHERE update_datetime IS NOT NULL 
   AND DATE(update_datetime) IS NULL
   AND TIME(update_datetime) IS NOT NULL;

-- 2. 시간만 저장된 경우 (날짜가 1970-01-01인 경우) create_datetime으로 설정
UPDATE posts 
SET update_datetime = create_datetime 
WHERE update_datetime IS NULL 
   OR update_datetime = create_datetime 
   OR update_datetime < '1970-01-02 00:00:00'
   OR DATE(update_datetime) = '1970-01-01'
   OR DATE(update_datetime) IS NULL;

-- 3. update_datetime이 create_datetime보다 이전인 경우도 수정
UPDATE posts 
SET update_datetime = create_datetime 
WHERE update_datetime < create_datetime;

-- 확인 쿼리: 수정된 데이터 확인
-- SELECT id, title, create_datetime, update_datetime, 
--        CASE WHEN update_datetime = create_datetime THEN '수정안됨' ELSE '수정됨' END as status
-- FROM posts 
-- ORDER BY id DESC LIMIT 10;

