-- group_id와 is_public 컬럼을 완전히 설정하는 통합 스크립트
-- 각 단계에서 에러가 발생하면 해당 단계를 건너뛰고 다음 단계로 진행하세요

-- ============================================
-- 1단계: 기존 제약조건 및 인덱스 정리
-- ============================================
-- 외래키 제약조건 삭제 (에러 무시 가능)
ALTER TABLE posts DROP FOREIGN KEY fk_post_group;

-- 인덱스 삭제 (에러 무시 가능)
ALTER TABLE posts DROP INDEX idx_posts_group_id;

-- ============================================
-- 2단계: group_id 컬럼 처리
-- ============================================
-- group_id 컬럼이 이미 있는지 확인하고 타입 수정 또는 추가

-- 먼저 컬럼이 있는지 확인 (수동으로 확인 후 아래 중 하나만 실행)
-- 컬럼이 이미 있는 경우:
ALTER TABLE posts MODIFY COLUMN group_id INT NULL;

-- 컬럼이 없는 경우 (위 명령어 대신 아래 명령어 실행):
-- ALTER TABLE posts ADD COLUMN group_id INT NULL AFTER user_id;

-- ============================================
-- 3단계: 외래키 및 인덱스 추가
-- ============================================
-- 외래키 제약조건 추가
ALTER TABLE posts 
ADD CONSTRAINT fk_post_group 
FOREIGN KEY (group_id) REFERENCES user_groups(id) 
ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- ============================================
-- 4단계: is_public 컬럼 추가
-- ============================================
-- is_public 컬럼 추가 (이미 있으면 에러 발생, 무시 가능)
ALTER TABLE posts 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE AFTER group_id;

-- 인덱스 추가
CREATE INDEX idx_posts_is_public ON posts(is_public);
