-- posts 테이블에 is_public 컬럼 추가
-- 주의: group_id 컬럼이 이미 있는 경우에만 AFTER group_id를 사용하세요
-- group_id가 없는 경우 아래 주석 처리된 명령어를 사용하세요

-- group_id가 있는 경우:
-- ALTER TABLE posts 
-- ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER group_id;

-- group_id가 없는 경우 (또는 위치가 중요하지 않은 경우):
ALTER TABLE posts 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_posts_is_public ON posts(is_public);
