package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.errorcode.GroupErrorCode;
import com.pgh.api_practice.exception.GroupException;
import com.pgh.api_practice.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupChatRoomRepository groupChatRoomRepository;
    private final UserRepository userRepository;
    private final GroupChatMessageRepository groupChatMessageRepository;
    private final MessageReactionRepository messageReactionRepository;

    /* =========================
     * 현재 사용자
     * ========================= */
    private Users getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    /* =========================
     * 모임 생성
     * ========================= */
    @Transactional
    public Long createGroup(CreateGroupDTO dto) {
        Users user = getCurrentUser();
        if (user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        long joinedGroupCount =
                groupMemberRepository.countDistinctGroupByUserId(user.getId());

        if (joinedGroupCount >= 10) {
            throw new GroupException(GroupErrorCode.GROUP_LIMIT_EXCEEDED);
        }

        Group group = groupRepository.save(
                Group.builder()
                        .name(dto.getName())
                        .description(dto.getDescription())
                        .owner(user)
                        .profileImageUrl(dto.getProfileImageUrl())
                        .build()
        );

        // owner = member + admin (필수)
        groupMemberRepository.save(
                GroupMember.builder()
                        .group(group)
                        .user(user)
                        .isAdmin(true)
                        .build()
        );

        // 관리자 채팅방
        groupChatRoomRepository.save(
                GroupChatRoom.builder()
                        .group(group)
                        .name("관리자방")
                        .description("모임 관리자 전용 채팅방입니다.")
                        .isAdminRoom(true)
                        .build()
        );

        // 일반 채팅방
        groupChatRoomRepository.save(
                GroupChatRoom.builder()
                        .group(group)
                        .name("일반방")
                        .description("모든 멤버가 사용할 수 있는 채팅방입니다.")
                        .isAdminRoom(false)
                        .build()
        );

        return group.getId();
    }

    /* =========================
     * 모임 목록 조회
     * ========================= */
    @Transactional(readOnly = true)
    public Page<GroupListDTO> getGroupList(Pageable pageable, Boolean myGroups) {
        Users user = getCurrentUser();
        if (Boolean.TRUE.equals(myGroups) && user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        Page<Group> groups =
                groupRepository.findByIsDeletedFalseOrderByCreatedTimeDesc(pageable);

        return groups.map(g -> GroupListDTO.builder()
                .id(g.getId())
                .name(g.getName())
                .description(g.getDescription())
                .profileImageUrl(g.getProfileImageUrl())
                .memberCount(groupMemberRepository.countByGroupId(g.getId()))
                .build());
    }

    /* =========================
     * 모임 상세 조회
     * ========================= */
    @Transactional(readOnly = true)
    public GroupDetailDTO getGroupDetail(Long groupId) {

        Users user = getCurrentUser(); // 로그인 안 했으면 null 가능
        Long userId = (user != null) ? user.getId() : null;

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        // 1. 멤버 수
        long memberCount =
                groupMemberRepository.countByGroupId(groupId);

        // 2. 멤버 여부
        boolean isMember = userId != null &&
                groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);

        // 3. 관리자 여부 (owner 기준)
        boolean isAdmin = userId != null &&
                group.getOwner().getId().equals(userId);

        GroupDetailDTO dto = GroupDetailDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerUsername(group.getOwner().getUsername())
                .ownerNickname(group.getOwner().getNickname())
                .profileImageUrl(group.getProfileImageUrl())
                .memberCount(memberCount)
                .createdTime(group.getCreatedTime())   // ← 핵심
                .updatedTime(group.getUpdatedTime())   // ← 핵심
                .isMember(isMember)
                .isAdmin(isAdmin)
                .build();


        return dto;
    }

    /* =========================
     * 모임 가입 여부
     * ========================= */
    @Transactional(readOnly = true)
    public boolean checkMembership(Long groupId) {
        Users user = getCurrentUser();
        if (user == null) return false;
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());
    }

    /* =========================
     * 모임 가입
     * ========================= */
    @Transactional
    public void joinGroup(Long groupId) {
        Users user = getCurrentUser();
        if (user == null) throw new GroupException(GroupErrorCode.UNAUTHORIZED);

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId())) {
            throw new GroupException(GroupErrorCode.ALREADY_JOINED);
        }

        groupMemberRepository.save(
                GroupMember.builder()
                        .group(group)
                        .user(user)
                        .isAdmin(false)
                        .build()
        );
    }

    /* =========================
     * 모임 탈퇴
     * ========================= */
    @Transactional
    public void leaveGroup(Long groupId) {
        Users user = getCurrentUser();
        if (user == null) throw new GroupException(GroupErrorCode.UNAUTHORIZED);

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        if (group.getOwner().getId().equals(user.getId())) {
            throw new GroupException(GroupErrorCode.OWNER_CANNOT_LEAVE);
        }

        groupMemberRepository.deleteByGroupIdAndUserId(groupId, user.getId());
    }

    /* =========================
     * 모임 수정
     * ========================= */
    @Transactional
    public void updateGroup(Long groupId, UpdateGroupDTO dto) {
        Users user = getCurrentUser();
        if (user == null) throw new GroupException(GroupErrorCode.UNAUTHORIZED);

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        if (!group.getOwner().getId().equals(user.getId())) {
            throw new GroupException(GroupErrorCode.OWNER_ONLY);
        }

        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setProfileImageUrl(dto.getProfileImageUrl());
    }

    /* =========================
     * 모임 삭제
     * ========================= */
    @Transactional
    public void deleteGroup(Long groupId, String groupName) {
        Users user = getCurrentUser();
        if (user == null) throw new GroupException(GroupErrorCode.UNAUTHORIZED);

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        if (!group.getOwner().getId().equals(user.getId())) {
            throw new GroupException(GroupErrorCode.OWNER_ONLY);
        }

        if (groupName != null && !group.getName().equals(groupName.trim())) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        group.setDeleted(true);
    }

    /* =========================
     * 모임 멤버 목록
     * ========================= */
    @Transactional(readOnly = true)
    public List<GroupMemberDTO> getGroupMembers(Long groupId) {
        return groupMemberRepository.findByGroupId(groupId).stream()
                .map(m -> GroupMemberDTO.builder()
                        .userId(m.getUser().getId())
                        .username(m.getUser().getUsername())
                        .isAdmin(m.isAdmin())
                        .displayName(m.getDisplayName())
                        .build())
                .collect(Collectors.toList());
    }

    /* =========================
     * 관리자 권한 변경
     * ========================= */
    @Transactional
    public void updateMemberAdmin(Long groupId, Long userId, boolean isAdmin) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.MEMBER_NOT_FOUND));

        member.setAdmin(isAdmin);
    }

    /* =========================
     * 멤버 별명 변경
     * ========================= */
    @Transactional
    public void updateMemberDisplayName(Long groupId, Long userId, String displayName) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.MEMBER_NOT_FOUND));

        member.setDisplayName(displayName);
    }

    /* =========================
     * 채팅방 목록
     * ========================= */
    @Transactional(readOnly = true)
    public List<GroupChatRoomDTO> getChatRooms(Long groupId) {
        return groupChatRoomRepository
                .findByGroupIdAndIsDeletedFalseOrderByCreatedTimeAsc(groupId)
                .stream()
                .map(room -> GroupChatRoomDTO.builder()
                        .id(room.getId())
                        .name(room.getName())
                        .description(room.getDescription())
                        .isAdminRoom(room.isAdminRoom())
                        .build())
                .collect(Collectors.toList());
    }

    /* =========================
     * 채팅방 생성
     * ========================= */
    @Transactional
    public Long createChatRoom(Long groupId, CreateGroupChatRoomDTO dto) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.GROUP_NOT_FOUND));

        return groupChatRoomRepository.save(
                GroupChatRoom.builder()
                        .group(group)
                        .name(dto.getName())
                        .description(dto.getDescription())
                        .isAdminRoom(false)
                        .build()
        ).getId();
    }

    /* =========================
     * 채팅방 수정
     * ========================= */
    @Transactional
    public void updateChatRoom(Long groupId, Long roomId, UpdateGroupChatRoomDTO dto) {
        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.CHATROOM_NOT_FOUND));

        room.setName(dto.getName());
        room.setDescription(dto.getDescription());
    }

    /* =========================
     * 채팅방 삭제
     * ========================= */
    @Transactional
    public void deleteChatRoom(Long groupId, Long roomId) {
        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.CHATROOM_NOT_FOUND));

        room.setDeleted(true);
    }

    @Transactional
    public Long sendChatMessage(Long groupId, Long roomId, CreateGroupChatMessageDTO dto) {
        Users user = getCurrentUser();
        if (user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.CHATROOM_NOT_FOUND));

        if (!room.getGroup().getId().equals(groupId)) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());
        if (!isMember) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        GroupChatMessage message = groupChatMessageRepository.save(
                GroupChatMessage.builder()
                        .chatRoom(room)
                        .user(user)
                        .message(dto.getMessage())
                        .readCount(0)
                        .build()
        );

        return message.getId();
    }

    @Transactional(readOnly = true)
    public List<GroupChatMessageDTO> getChatMessages(
            Long groupId,
            Long roomId,
            int page,
            int size
    ) {
        Users user = getCurrentUser();
        if (user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.CHATROOM_NOT_FOUND));

        if (!room.getGroup().getId().equals(groupId)) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());
        if (!isMember) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        Pageable pageable = PageRequest.of(page, size);

        return groupChatMessageRepository
                .findByChatRoomIdAndIsDeletedFalseOrderByCreatedTimeDesc(roomId, pageable)
                .stream()
                .map(msg -> GroupChatMessageDTO.builder()
                        .id(msg.getId())
                        .message(msg.getMessage())
                        .username(msg.getUser().getUsername())
                        .nickname(msg.getUser().getNickname())
                        .profileImageUrl(msg.getUser().getProfileImageUrl())
                        .createdTime(msg.getCreatedTime())
                        .readCount(msg.getReadCount())
                        .build()
                )
                .toList();
    }

    @Transactional
    public void deleteChatMessage(Long groupId, Long roomId, Long messageId) {
        Users user = getCurrentUser();
        if (user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        GroupChatMessage message = groupChatMessageRepository.findById(messageId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.MESSAGE_NOT_FOUND));

        if (!message.getChatRoom().getId().equals(roomId)) {
            throw new GroupException(GroupErrorCode.INVALID_MESSAGE_ROOM);
        }

        boolean isAuthor = message.getUser().getId().equals(user.getId());
        boolean isAdmin = groupMemberRepository
                .findByGroupIdAndUserId(groupId, user.getId())
                .map(GroupMember::isAdmin)
                .orElse(false);

        if (!isAuthor && !isAdmin) {
            throw new GroupException(GroupErrorCode.FORBIDDEN);
        }

        groupChatMessageRepository.delete(message);
    }

    @Transactional
    public void toggleReaction(Long groupId, Long roomId, Long messageId, String emoji) {
        Users user = getCurrentUser();
        if (user == null) {
            throw new GroupException(GroupErrorCode.UNAUTHORIZED);
        }

        GroupChatMessage message = groupChatMessageRepository.findById(messageId)
                .orElseThrow(() -> new GroupException(GroupErrorCode.MESSAGE_NOT_FOUND));

        boolean exists = messageReactionRepository
                .existsByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);

        if (exists) {
            messageReactionRepository
                    .deleteByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);
        } else {
            messageReactionRepository.save(
                    MessageReaction.builder()
                            .message(message)
                            .user(user)
                            .emoji(emoji)
                            .build()
            );
        }
    }
}