-- group_id 컬럼이 이미 BIGINT로 추가된 경우 INT로 변경하는 스크립트 (간단 버전)
-- 에러가 발생하면 해당 단계를 건너뛰고 다음 단계로 진행하세요

-- 1. 기존 외래키 제약조건 삭제
-- 에러가 나면 이미 삭제된 것이므로 무시하고 다음 단계로 진행
ALTER TABLE posts DROP FOREIGN KEY fk_post_group;

-- 2. 기존 인덱스 삭제
-- 에러가 나면 이미 삭제된 것이므로 무시하고 다음 단계로 진행
ALTER TABLE posts DROP INDEX idx_posts_group_id;

-- 3. group_id 컬럼 타입 변경 (BIGINT -> INT)
ALTER TABLE posts 
MODIFY COLUMN group_id INT NULL;

-- 4. 외래키 제약조건 다시 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 5. 인덱스 다시 추가
CREATE INDEX idx_posts_group_id ON posts(group_id);
