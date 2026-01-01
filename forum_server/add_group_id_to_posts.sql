-- posts 테이블에 group_id 컬럼 추가
-- 주의: user_groups.id의 타입에 따라 BIGINT 또는 INT를 선택하세요
-- 먼저 check_user_groups_id_type.sql을 실행하여 타입을 확인하세요

-- user_groups.id가 BIGINT인 경우:
ALTER TABLE posts 
ADD COLUMN group_id BIGINT NULL AFTER user_id;

-- user_groups.id가 INT인 경우 (위 명령어 대신 아래 명령어 사용):
-- ALTER TABLE posts 
-- ADD COLUMN group_id INT NULL AFTER user_id;

-- 외래키 제약조건 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_group_id ON posts(group_id);
