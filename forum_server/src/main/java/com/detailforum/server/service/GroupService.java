package com.detailforum.server.service;

import com.detailforum.server.dto.CreateGroupDTO;
import com.detailforum.server.dto.GroupDetailDTO;
import com.detailforum.server.dto.GroupListDTO;
import com.detailforum.server.dto.GroupMemberDTO;
import com.detailforum.server.dto.UpdateGroupDTO;
import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupChatRoom;
import com.detailforum.server.entity.GroupMember;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationBadRequestException;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.GroupChatRoomRepository;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** 모임 만들기·찾기·가입·탈퇴·수정·삭제와 멤버 관리. 채팅은 GroupChatService가 맡는다. */
@Service
@RequiredArgsConstructor
public class GroupService {

    private static final int MAX_GROUPS_PER_USER = 10;

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupChatRoomRepository groupChatRoomRepository;
    private final CurrentUser currentUser;
    private final GroupAccess access;

    /** 모임을 만들고 만든 사람을 관리자로 넣는다. 기본 채팅방(관리자방, 일반방)도 함께 만든다 */
    @Transactional
    public Long createGroup(CreateGroupDTO dto) {
        Users user = currentUser.require();

        long joined = groupRepository.countByOwnerId(user.getId()) + groupMemberRepository.findByUserId(user.getId()).size();
        if (joined >= MAX_GROUPS_PER_USER) {
            throw new IllegalStateException("한 사용자는 최대 10개의 모임에 가입할 수 있습니다.");
        }

        Group created = groupRepository.save(Group.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .owner(user)
                .profileImageUrl(dto.getProfileImageUrl())
                .build());

        groupMemberRepository.save(GroupMember.builder().group(created).user(user).isAdmin(true).build());
        groupChatRoomRepository.save(GroupChatRoom.builder()
                .group(created).name("관리자방").description("모임 관리자 전용 채팅방입니다.").isAdminRoom(true).build());
        groupChatRoomRepository.save(GroupChatRoom.builder()
                .group(created).name("일반방").description("모든 멤버가 사용할 수 있는 채팅방입니다.").isAdminRoom(false).build());

        return created.getId();
    }

    /** 이름·설명 검색. 최대 100개 */
    @Transactional(readOnly = true)
    public List<GroupListDTO> searchGroups(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        Users user = currentUser.find().orElse(null);
        return groupRepository.searchGroups(query.trim()).stream()
                .limit(100)
                .map(group -> listItem(group, access.of(group, user))
                        .memberCount((int) groupMemberRepository.countByGroupId(group.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    /** 모임 목록. myGroups면 내가 주인이거나 멤버인 모임만 */
    @Transactional(readOnly = true)
    public Page<GroupListDTO> getGroupList(Pageable pageable, Boolean myGroups) {
        Users user = currentUser.find().orElse(null);
        Page<Group> groups;

        if (Boolean.TRUE.equals(myGroups) && user != null) {
            List<Long> groupIds = Stream.concat(
                            groupRepository.findByOwnerIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId()).stream().map(Group::getId),
                            groupMemberRepository.findByUserId(user.getId()).stream().map(gm -> gm.getGroup().getId()))
                    .distinct()
                    .toList();
            if (groupIds.isEmpty()) {
                return new PageImpl<>(new ArrayList<>(), pageable, 0);
            }
            groups = groupRepository.findByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(groupIds, pageable);
        } else {
            groups = groupRepository.findByIsDeletedFalseOrderByCreatedTimeDesc(pageable);
        }

        List<GroupListDTO> items = groups.getContent().stream()
                .map(group -> {
                    GroupAccess.Membership me = access.of(group, user);
                    return listItem(group, me)
                            .memberCount(groupMemberRepository.countByGroupId(group.getId()))
                            .isAdmin(me.admin())
                            .build();
                })
                .collect(Collectors.toList());
        return new PageImpl<>(items, pageable, groups.getTotalElements());
    }

    @Transactional(readOnly = true)
    public GroupDetailDTO getGroupDetail(Long groupId) {
        Group group = findGroup(groupId);
        GroupAccess.Membership me = access.of(group, currentUser.find().orElse(null));

        return GroupDetailDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerUsername(group.getOwner().getUsername())
                .ownerNickname(group.getOwner().getNickname())
                .profileImageUrl(group.getProfileImageUrl())
                .memberCount(groupMemberRepository.countByGroupId(groupId))
                .createdTime(group.getCreatedTime())
                .updatedTime(PostListing.shownUpdatedTime(group.getCreatedTime(), group.getUpdatedTime()))
                .isMember(me.member())
                .isAdmin(me.admin())
                .build();
    }

    /** 로그인하지 않았으면 false */
    @Transactional(readOnly = true)
    public boolean checkMembership(Long groupId) {
        Users user = currentUser.find().orElse(null);
        if (user == null) {
            return false;
        }
        return access.of(findGroup(groupId), user).member();
    }

    @Transactional
    public void joinGroup(Long groupId) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId())) {
            throw new IllegalStateException("이미 가입한 모임입니다.");
        }
        groupMemberRepository.save(GroupMember.builder().group(group).user(user).isAdmin(false).build());
    }

    /** 주인은 탈퇴할 수 없다 (모임 삭제를 써야 한다) */
    @Transactional
    public void leaveGroup(Long groupId) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (access.isOwner(group, user)) {
            throw new ApplicationBadRequestException("모임 주인은 탈퇴할 수 없습니다. 모임을 삭제하려면 모임 관리 페이지에서 삭제 기능을 사용하세요.");
        }
        groupMemberRepository.deleteByGroupIdAndUserId(groupId, user.getId());
    }

    /** 관리자(주인 포함)만 고칠 수 있다 */
    @Transactional
    public void updateGroup(Long groupId, UpdateGroupDTO dto) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (!access.isAdmin(group, user)) {
            throw new ApplicationUnauthorizedException("모임 관리자만 수정할 수 있습니다.");
        }

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            group.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            group.setDescription(dto.getDescription());
        }
        if (dto.getProfileImageUrl() != null) {
            group.setProfileImageUrl(dto.getProfileImageUrl());
        }
        groupRepository.save(group);
    }

    /** 멤버 목록. 주인은 항상 관리자로 표시하고, 목록에 없으면 맨 앞에 넣는다 */
    @Transactional(readOnly = true)
    public List<GroupMemberDTO> getGroupMembers(Long groupId) {
        Group group = findGroup(groupId);
        Users owner = group.getOwner();
        Long ownerId = owner.getId();

        List<GroupMemberDTO> members = groupMemberRepository.findByGroupId(groupId).stream()
                .map(member -> {
                    Users user = member.getUser();
                    boolean isOwner = user.getId().equals(ownerId);
                    return GroupMemberDTO.builder()
                            .userId(user.getId())
                            .username(user.getUsername())
                            .nickname(user.getNickname())
                            .profileImageUrl(user.getProfileImageUrl())
                            .displayName(member.getDisplayName())
                            .isAdmin(isOwner || member.isAdmin())
                            .isOwner(isOwner)
                            .build();
                })
                .collect(Collectors.toList());

        if (members.stream().noneMatch(m -> m.getUserId().equals(ownerId))) {
            members.add(0, GroupMemberDTO.builder()
                    .userId(ownerId)
                    .username(owner.getUsername())
                    .nickname(owner.getNickname())
                    .profileImageUrl(owner.getProfileImageUrl())
                    .displayName(null)
                    .isAdmin(true)
                    .isOwner(true)
                    .build());
        }
        return members;
    }

    /** 주인만 다른 멤버의 관리자 권한을 바꿀 수 있다 */
    @Transactional
    public void updateMemberAdmin(Long groupId, Long userId, boolean isAdmin) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (!access.isOwner(group, user)) {
            throw new ApplicationUnauthorizedException("모임 주인만 멤버 권한을 변경할 수 있습니다.");
        }
        if (user.getId().equals(userId)) {
            throw new IllegalArgumentException("자신의 권한은 변경할 수 없습니다.");
        }
        if (group.getOwner().getId().equals(userId)) {
            throw new IllegalArgumentException("모임 주인의 권한은 변경할 수 없습니다.");
        }

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("멤버를 찾을 수 없습니다."));
        member.setAdmin(isAdmin);
        groupMemberRepository.save(member);
    }

    /** 본인 별명만 바꿀 수 있다. 빈 값이면 지운다. 멤버 행이 없는 주인은 아무것도 하지 않는다 */
    @Transactional
    public void updateMemberDisplayName(Long groupId, Long userId, String displayName) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (!user.getId().equals(userId)) {
            throw new ApplicationUnauthorizedException("본인의 별명만 변경할 수 있습니다.");
        }

        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId).orElse(null);
        if (member == null) {
            if (!group.getOwner().getId().equals(userId)) {
                throw new ResourceNotFoundException("모임 멤버를 찾을 수 없습니다.");
            }
            return;
        }
        member.setDisplayName(displayName != null && displayName.trim().isEmpty() ? null : displayName);
        groupMemberRepository.save(member);
    }

    /** 주인만 지울 수 있다. groupName을 주면 이름이 맞아야 한다 (소프트 삭제) */
    @Transactional
    public void deleteGroup(Long groupId, String groupName) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (!access.isOwner(group, user)) {
            throw new ApplicationUnauthorizedException("모임 주인만 삭제할 수 있습니다.");
        }
        if (groupName != null && !groupName.trim().isEmpty() && !group.getName().equals(groupName.trim())) {
            throw new ApplicationBadRequestException("모임 이름이 일치하지 않습니다.");
        }
        group.setDeleted(true);
        groupRepository.save(group);
    }

    private GroupListDTO.GroupListDTOBuilder listItem(Group group, GroupAccess.Membership me) {
        return GroupListDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerUsername(group.getOwner().getUsername())
                .ownerNickname(group.getOwner().getNickname())
                .profileImageUrl(group.getProfileImageUrl())
                .createdTime(group.getCreatedTime())
                .isMember(me.member());
    }

    private Group findGroup(Long groupId) {
        return groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
    }
}
