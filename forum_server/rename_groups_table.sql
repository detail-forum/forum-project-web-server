-- groups 테이블을 user_groups로 이름 변경
-- 기존 테이블이 있다면 이름 변경, 없다면 무시

-- 테이블 이름 변경
RENAME TABLE `groups` TO `user_groups`;

-- 외래키가 있는 경우 참조 테이블도 확인 필요
-- group_members 테이블의 외래키 확인
-- group_posts 테이블의 외래키 확인
-- group_chat_rooms 테이블의 외래키 확인
