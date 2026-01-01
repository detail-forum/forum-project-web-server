-- comments 테이블에 group_post_id 컬럼 추가 (간단한 버전)
-- MySQL 버전에 따라 IF NOT EXISTS를 지원하지 않을 수 있으므로 수동으로 확인 후 실행

-- 1. comments 테이블에 group_post_id 컬럼 추가
ALTER TABLE comments 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- 2. post_likes 테이블에 group_post_id 컬럼 추가
ALTER TABLE post_likes 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- 3. 외래키 제약조건 추가
ALTER TABLE comments 
ADD CONSTRAINT fk_comment_group_post 
FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

ALTER TABLE post_likes 
ADD CONSTRAINT fk_post_like_group_post 
FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

-- 4. 인덱스 추가
CREATE INDEX idx_comments_group_post_id ON comments(group_post_id);
CREATE INDEX idx_post_likes_group_post_id ON post_likes(group_post_id);

-- 5. post_likes 테이블의 unique 제약조건 추가
ALTER TABLE post_likes 
ADD CONSTRAINT unique_group_post_user UNIQUE (group_post_id, user_id);
