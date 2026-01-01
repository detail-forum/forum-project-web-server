-- group_id 타입을 수정한 후 is_public 컬럼을 추가하는 스크립트

-- is_public 컬럼 추가
ALTER TABLE posts 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER group_id;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_is_public ON posts(is_public);
