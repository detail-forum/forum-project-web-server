-- comments 테이블에 group_post_id 컬럼 추가
ALTER TABLE comments 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- post_likes 테이블에 group_post_id 컬럼 추가
ALTER TABLE post_likes 
ADD COLUMN group_post_id INT NULL AFTER post_id;

-- 외래키 제약조건 추가
ALTER TABLE comments 
ADD CONSTRAINT fk_comment_group_post 
FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

ALTER TABLE post_likes 
ADD CONSTRAINT fk_post_like_group_post 
FOREIGN KEY (group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

-- 인덱스 추가
CREATE INDEX idx_comments_group_post_id ON comments(group_post_id);
CREATE INDEX idx_post_likes_group_post_id ON post_likes(group_post_id);

-- 기존 unique 제약조건 수정 (post_likes 테이블)
-- 기존 제약조건 삭제 (이름 확인 필요)
-- ALTER TABLE post_likes DROP INDEX unique_post_user;  -- 필요시 실행
-- 새로운 unique 제약조건 추가
ALTER TABLE post_likes 
ADD CONSTRAINT unique_group_post_user UNIQUE (group_post_id, user_id);
