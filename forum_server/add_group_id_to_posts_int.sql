-- posts 테이블에 group_id 컬럼 추가
-- user_groups.id가 INT인 경우 사용

ALTER TABLE posts 
ADD COLUMN group_id INT NULL AFTER user_id;

-- 외래키 제약조건 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_group_id ON posts(group_id);
