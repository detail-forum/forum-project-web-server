-- posts 테이블에 group_id와 is_public 컬럼을 한 번에 추가하는 통합 스크립트

-- 1. group_id 컬럼 추가
ALTER TABLE posts 
ADD COLUMN group_id BIGINT NULL AFTER user_id;

-- 2. 외래키 제약조건 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 3. group_id 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- 4. is_public 컬럼 추가
ALTER TABLE posts 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER group_id;

-- 5. is_public 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_is_public ON posts(is_public);
