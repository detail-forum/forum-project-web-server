-- 채팅방 프로필 이미지 컬럼 추가
-- group_chat_rooms 테이블에 profile_image_url 컬럼 추가

ALTER TABLE group_chat_rooms 
ADD COLUMN profile_image_url VARCHAR(500) NULL 
AFTER description;
