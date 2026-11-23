package com.detailforum.server.service;

import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupMember;
import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 모임 안에서의 자격: 주인, 멤버, 관리자. 모임 서비스와 모임 채팅 서비스가 함께 쓴다. */
@Component
@RequiredArgsConstructor
public class GroupAccess {

    private final GroupMemberRepository groupMemberRepository;

    /** 목록·상세 화면에 내려주는 내 자격. 주인은 멤버이자 관리자다. */
    public record Membership(boolean member, boolean admin) {
        static final Membership NONE = new Membership(false, false);
    }

    public Membership of(Group group, Users user) {
        if (user == null) return Membership.NONE;
        if (isOwner(group, user)) return new Membership(true, true);
        return groupMemberRepository.findByGroupIdAndUserId(group.getId(), user.getId())
                .map(m -> new Membership(true, m.isAdmin()))
                .orElse(Membership.NONE);
    }

    public boolean isOwner(Group group, Users user) {
        if (group == null || user == null || group.getOwner() == null) return false;
        if (group.getOwner().getId() == null || user.getId() == null) return false;
        return group.getOwner().getId().equals(user.getId());
    }

    /** group_members 행이 있는지만 본다 (주인도 만들 때 행이 생긴다) */
    public boolean isMember(Long groupId, Long userId) {
        if (groupId == null || userId == null) return false;
        return groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId);
    }

    /** 주인이거나 관리자 권한이 있는 멤버 */
    public boolean isAdmin(Group group, Users user) {
        if (group == null || user == null || user.getId() == null) return false;
        if (isOwner(group, user)) return true;
        return groupMemberRepository.findByGroup_IdAndUser_Id(group.getId(), user.getId())
                .map(GroupMember::isAdmin)
                .orElse(false);
    }
}
