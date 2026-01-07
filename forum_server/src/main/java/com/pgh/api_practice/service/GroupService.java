package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.exception.ApplicationBadRequestException;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupChatRoomRepository groupChatRoomRepository;
    private final GroupPostRepository groupPostRepository;
    private final GroupChatMessageRepository groupChatMessageRepository;
    private final UserRepository userRepository;
    private final MessageReactionRepository messageReactionRepository;

    /** 현재 사용자 가져오기 */
    private Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    /** 모임 생성 */
    @Transactional
    public Long createGroup(CreateGroupDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        // 사용자가 가입한 모임 수 확인 (주인인 모임 포함)
        long ownedGroupCount = groupRepository.countByOwnerId(currentUser.getId());
        long memberGroupCount = groupMemberRepository.findByUserId(currentUser.getId()).size();
        long totalGroupCount = ownedGroupCount + memberGroupCount;
        
        if (totalGroupCount >= 10) {
            throw new IllegalStateException("한 사용자는 최대 10개의 모임에 가입할 수 있습니다.");
        }

        Group group = Group.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .owner(currentUser)
                .profileImageUrl(dto.getProfileImageUrl())
                .build();

        Group created = groupRepository.save(group);

        // 모임 생성자를 관리자로 추가
        GroupMember ownerMember = GroupMember.builder()
                .group(created)
                .user(currentUser)
                .isAdmin(true)
                .build();
        groupMemberRepository.save(ownerMember);

        // 기본 채팅방 생성 (관리자방, 일반방)
        GroupChatRoom adminRoom = GroupChatRoom.builder()
                .group(created)
                .name("관리자방")
                .description("모임 관리자 전용 채팅방입니다.")
                .isAdminRoom(true)
                .build();
        groupChatRoomRepository.save(adminRoom);

        GroupChatRoom generalRoom = GroupChatRoom.builder()
                .group(created)
                .name("일반방")
                .description("모든 멤버가 사용할 수 있는 채팅방입니다.")
                .isAdminRoom(false)
                .build();
        groupChatRoomRepository.save(generalRoom);

        return created.getId();
    }

    /** 모임 목록 조회 */
    @Transactional(readOnly = true)
    public Page<GroupListDTO> getGroupList(Pageable pageable, Boolean myGroups) {
        Users currentUser = getCurrentUser();
        Page<Group> groups;
        
        // 내 모임만 필터링하는 경우
        if (myGroups != null && myGroups && currentUser != null) {
            // 현재 사용자가 주인인 모임 조회
            List<Group> ownedGroups = groupRepository.findByOwnerIdAndIsDeletedFalseOrderByCreatedTimeDesc(currentUser.getId());
            
            // 현재 사용자가 멤버인 모임 조회
            List<GroupMember> memberships = groupMemberRepository.findByUserId(currentUser.getId());
            List<Long> memberGroupIds = memberships.stream()
                    .map(gm -> gm.getGroup().getId())
                    .collect(Collectors.toList());
            
            // 주인인 모임과 멤버인 모임 합치기
            List<Long> allGroupIds = new ArrayList<>();
            allGroupIds.addAll(ownedGroups.stream().map(Group::getId).collect(Collectors.toList()));
            allGroupIds.addAll(memberGroupIds);
            
            if (allGroupIds.isEmpty()) {
                return new PageImpl<>(new ArrayList<>(), pageable, 0);
            }
            
            // 중복 제거
            allGroupIds = allGroupIds.stream().distinct().collect(Collectors.toList());
            
            // 해당 모임들만 조회 (페이지네이션 적용)
            groups = groupRepository.findByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(allGroupIds, pageable);
        } else {
            // 전체 모임 조회
            groups = groupRepository.findByIsDeletedFalseOrderByCreatedTimeDesc(pageable);
        }

        List<GroupListDTO> groupList = groups.getContent().stream().map(group -> {
            long memberCount = groupMemberRepository.countByGroupId(group.getId());
            boolean isMember = false;
            boolean isAdmin = false;

            if (currentUser != null) {
                // 모임 주인인지 확인
                boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
                if (isOwner) {
                    isMember = true;
                    isAdmin = true;
                } else {
                    Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(group.getId(), currentUser.getId());
                    if (member.isPresent()) {
                        isMember = true;
                        isAdmin = member.get().isAdmin();
                    }
                }
            }

            return GroupListDTO.builder()
                    .id(group.getId())
                    .name(group.getName())
                    .description(group.getDescription())
                    .ownerUsername(group.getOwner().getUsername())
                    .ownerNickname(group.getOwner().getNickname())
                    .profileImageUrl(group.getProfileImageUrl())
                    .memberCount(memberCount)
                    .createdTime(group.getCreatedTime())
                    .isMember(isMember)
                    .isAdmin(isAdmin)
                    .build();
        }).collect(Collectors.toList());

        return new PageImpl<>(groupList, pageable, groups.getTotalElements());
    }

    /** 모임 상세 조회 */
    @Transactional(readOnly = true)
    public GroupDetailDTO getGroupDetail(Long groupId) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        long memberCount = groupMemberRepository.countByGroupId(groupId);
        Users currentUser = getCurrentUser();
        boolean isMember = false;
        boolean isAdmin = false;

        if (currentUser != null) {
            // 모임 주인인지 확인 (ID와 username 모두 확인)
            boolean isOwnerById = group.getOwner().getId().equals(currentUser.getId());
            boolean isOwnerByUsername = group.getOwner().getUsername().equals(currentUser.getUsername());
            boolean isOwner = isOwnerById || isOwnerByUsername;
            
            if (isOwner) {
                isMember = true;
                isAdmin = true; // 모임 주인은 항상 관리자
            } else {
                // 멤버인지 확인
                Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
                if (member.isPresent()) {
                    isMember = true;
                    isAdmin = member.get().isAdmin();
                }
            }
        }

        LocalDateTime updateTime = group.getUpdatedTime();
        if (updateTime == null || updateTime.isBefore(group.getCreatedTime()) ||
            updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
            updateTime = group.getCreatedTime();
        }

        return GroupDetailDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerUsername(group.getOwner().getUsername())
                .ownerNickname(group.getOwner().getNickname())
                .profileImageUrl(group.getProfileImageUrl())
                .memberCount(memberCount)
                .createdTime(group.getCreatedTime())
                .updatedTime(updateTime)
                .isMember(isMember)
                .isAdmin(isAdmin)
                .build();
    }

    /** 모임 가입 여부 확인 */
    @Transactional(readOnly = true)
    public boolean checkMembership(Long groupId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            return false;
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 모임 주인인지 확인
        if (group.getOwner().getId().equals(currentUser.getId())) {
            return true;
        }

        // 멤버인지 확인
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId());
    }

    /** 모임 가입 */
    @Transactional
    public void joinGroup(Long groupId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId())) {
            throw new IllegalStateException("이미 가입한 모임입니다.");
        }

        GroupMember member = GroupMember.builder()
                .group(group)
                .user(currentUser)
                .isAdmin(false)
                .build();
        groupMemberRepository.save(member);
    }

    /** 모임 탈퇴 */
    @Transactional
    public void leaveGroup(Long groupId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 모임 주인은 탈퇴할 수 없음
        if (group.getOwner().getId().equals(currentUser.getId())) {
            throw new ApplicationBadRequestException("모임 주인은 탈퇴할 수 없습니다. 모임을 삭제하려면 모임 관리 페이지에서 삭제 기능을 사용하세요.");
        }

        groupMemberRepository.deleteByGroupIdAndUserId(groupId, currentUser.getId());
    }

    /** 모임 수정 */
    @Transactional
    public void updateGroup(Long groupId, UpdateGroupDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 모임 주인인지 확인
        boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
        if (!isOwner) {
            // 관리자만 수정 가능
            Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
            if (member.isEmpty() || !member.get().isAdmin()) {
                throw new ApplicationUnauthorizedException("모임 관리자만 수정할 수 있습니다.");
            }
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

    /** 모임 멤버 목록 조회 */
    @Transactional(readOnly = true)
    public List<GroupMemberDTO> getGroupMembers(Long groupId) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        Users owner = group.getOwner();
        Long ownerId = owner.getId();

        List<GroupMemberDTO> memberDTOs = members.stream().map(member -> {
            Users user = member.getUser();
            return GroupMemberDTO.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .nickname(user.getNickname())
                    .profileImageUrl(user.getProfileImageUrl())
                    .displayName(member.getDisplayName())  // 채팅방별 별명
                    .isAdmin(member.isAdmin())
                    .isOwner(user.getId().equals(ownerId))
                    .build();
        }).collect(Collectors.toList());

        // 모임 주인이 멤버 목록에 없으면 추가 (주인은 항상 관리자)
        boolean ownerInList = memberDTOs.stream()
                .anyMatch(m -> m.getUserId().equals(ownerId));
        
        if (!ownerInList) {
            GroupMemberDTO ownerDTO = GroupMemberDTO.builder()
                    .userId(owner.getId())
                    .username(owner.getUsername())
                    .nickname(owner.getNickname())
                    .profileImageUrl(owner.getProfileImageUrl())
                    .displayName(null)  // 주인은 별명 없음 (또는 별도 처리)
                    .isAdmin(true) // 주인은 항상 관리자
                    .isOwner(true)
                    .build();
            memberDTOs.add(0, ownerDTO); // 주인을 맨 앞에 추가
        } else {
            // 주인이 이미 목록에 있으면 isOwner와 isAdmin을 true로 설정
            memberDTOs.forEach(m -> {
                if (m.getUserId().equals(ownerId)) {
                    m.setOwner(true);
                    m.setAdmin(true);
                }
            });
        }

        return memberDTOs;
    }

    /** 멤버 관리자 권한 변경 */
    @Transactional
    public void updateMemberAdmin(Long groupId, Long userId, boolean isAdmin) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 모임 주인만 권한 변경 가능
        if (!group.getOwner().getId().equals(currentUser.getId())) {
            throw new ApplicationUnauthorizedException("모임 주인만 멤버 권한을 변경할 수 있습니다.");
        }

        // 자신의 권한은 변경할 수 없음
        if (currentUser.getId().equals(userId)) {
            throw new IllegalArgumentException("자신의 권한은 변경할 수 없습니다.");
        }

        // 모임 주인의 권한은 변경할 수 없음
        if (group.getOwner().getId().equals(userId)) {
            throw new IllegalArgumentException("모임 주인의 권한은 변경할 수 없습니다.");
        }

        Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
        if (memberOpt.isEmpty()) {
            throw new ResourceNotFoundException("멤버를 찾을 수 없습니다.");
        }

        GroupMember member = memberOpt.get();
        member.setAdmin(isAdmin);
        groupMemberRepository.save(member);
    }

    /** 멤버 별명 변경 */
    @Transactional
    public void updateMemberDisplayName(Long groupId, Long userId, String displayName) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 본인만 자신의 별명을 변경할 수 있음
        if (!currentUser.getId().equals(userId)) {
            throw new ApplicationUnauthorizedException("본인의 별명만 변경할 수 있습니다.");
        }

        // 모임 멤버인지 확인
        Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
        if (memberOpt.isEmpty()) {
            // 모임 주인인 경우 별도 처리
            if (!group.getOwner().getId().equals(userId)) {
                throw new ResourceNotFoundException("모임 멤버를 찾을 수 없습니다.");
            }
            // 모임 주인은 별명을 설정할 수 없거나 별도 처리 필요
            // 여기서는 주인도 별명을 설정할 수 있도록 처리하지 않음
            return;
        }

        GroupMember member = memberOpt.get();
        member.setDisplayName(displayName != null && displayName.trim().isEmpty() ? null : displayName);
        groupMemberRepository.save(member);
    }

    /** 모임 삭제 */
    @Transactional
    public void deleteGroup(Long groupId, String groupName) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 모임 주인만 삭제 가능
        if (!group.getOwner().getId().equals(currentUser.getId())) {
            throw new ApplicationUnauthorizedException("모임 주인만 삭제할 수 있습니다.");
        }

        // 모임 이름 확인 (제공된 경우)
        if (groupName != null && !groupName.trim().isEmpty()) {
            if (!group.getName().equals(groupName.trim())) {
                throw new ApplicationBadRequestException("모임 이름이 일치하지 않습니다.");
            }
        }

        group.setDeleted(true);
        groupRepository.save(group);
    }

    /** 채팅방 목록 조회 */
    @Transactional(readOnly = true)
    public List<GroupChatRoomDTO> getChatRooms(Long groupId) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        Users currentUser = getCurrentUser();
        boolean isAdmin = false;

        if (currentUser != null) {
            // 모임 주인인지 확인
            boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
            if (isOwner) {
                isAdmin = true; // 모임 주인은 항상 관리자
            } else {
                // 멤버인지 확인
                Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
                if (member.isPresent()) {
                    isAdmin = member.get().isAdmin();
                }
            }
        }

        List<GroupChatRoom> rooms = groupChatRoomRepository.findByGroupIdAndIsDeletedFalseOrderByCreatedTimeAsc(groupId);
        
        // 관리자가 아니면 관리자방 제외
        final boolean finalIsAdmin = isAdmin;
        return rooms.stream()
                .filter(room -> finalIsAdmin || !room.isAdminRoom())
                .map(room -> GroupChatRoomDTO.builder()
                        .id(room.getId())
                        .name(room.getName())
                        .description(room.getDescription())
                        .profileImageUrl(room.getProfileImageUrl())
                        .isAdminRoom(room.isAdminRoom())
                        .createdTime(room.getCreatedTime())
                        .build())
                .collect(Collectors.toList());
    }

    /** 채팅방 생성 */
    @Transactional
    public Long createChatRoom(Long groupId, CreateGroupChatRoomDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        // 관리자만 채팅방 생성 가능
        Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
        if (member.isEmpty() || !member.get().isAdmin()) {
            throw new ApplicationUnauthorizedException("모임 관리자만 채팅방을 생성할 수 있습니다.");
        }

        GroupChatRoom room = GroupChatRoom.builder()
                .group(group)
                .name(dto.getName())
                .description(dto.getDescription())
                .isAdminRoom(false)
                .build();

        GroupChatRoom created = groupChatRoomRepository.save(room);
        return created.getId();
    }

    /** 채팅방 수정 */
    @Transactional
    public void updateChatRoom(Long groupId, Long roomId, UpdateGroupChatRoomDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        // 관리자만 채팅방 수정 가능
        Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
        boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
        if (!isOwner && (member.isEmpty() || !member.get().isAdmin())) {
            throw new ApplicationUnauthorizedException("모임 관리자만 채팅방을 수정할 수 있습니다.");
        }

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            room.setName(dto.getName());
        }
        if (dto.getDescription() != null) {
            room.setDescription(dto.getDescription());
        }
        if (dto.getProfileImageUrl() != null) {
            room.setProfileImageUrl(dto.getProfileImageUrl());
        }

        groupChatRoomRepository.save(room);
    }

    /** 채팅방 삭제 */
    @Transactional
    public void deleteChatRoom(Long groupId, Long roomId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        // 관리자만 채팅방 삭제 가능
        Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
        if (member.isEmpty() || !member.get().isAdmin()) {
            throw new ApplicationUnauthorizedException("모임 관리자만 채팅방을 삭제할 수 있습니다.");
        }

        // 기본 채팅방은 삭제 불가
        if (room.isAdminRoom() || "일반방".equals(room.getName())) {
            throw new IllegalStateException("기본 채팅방은 삭제할 수 없습니다.");
        }

        room.setDeleted(true);
        groupChatRoomRepository.save(room);
    }

    /** 채팅 메시지 전송 */
    @Transactional
    public Long sendChatMessage(Long groupId, Long roomId, CreateGroupChatMessageDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        // 모임 멤버인지 확인
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId())) {
            throw new ApplicationUnauthorizedException("모임 멤버만 메시지를 전송할 수 있습니다.");
        }

        // 관리자방은 관리자만 접근 가능
        if (room.isAdminRoom()) {
            Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
            if (member.isEmpty() || !member.get().isAdmin()) {
                throw new ApplicationUnauthorizedException("관리자만 관리자방에 메시지를 전송할 수 있습니다.");
            }
        }

        // 답장할 메시지 조회
        GroupChatMessage replyToMessage = null;
        if (dto.getReplyToMessageId() != null) {
            replyToMessage = groupChatMessageRepository.findById(dto.getReplyToMessageId())
                    .orElseThrow(() -> new ResourceNotFoundException("답장할 메시지를 찾을 수 없습니다."));
            // 같은 채팅방의 메시지인지 확인
            if (!replyToMessage.getChatRoom().getId().equals(roomId)) {
                throw new IllegalArgumentException("답장할 메시지가 같은 채팅방에 없습니다.");
            }
        }

        GroupChatMessage message = GroupChatMessage.builder()
                .chatRoom(room)
                .user(currentUser)
                .message(dto.getMessage())
                .replyToMessage(replyToMessage)
                .build();

        GroupChatMessage created = groupChatMessageRepository.save(message);
        return created.getId();
    }

    /** 채팅 메시지 목록 조회 */
    @Transactional(readOnly = true)
    public List<GroupChatMessageDTO> getChatMessages(Long groupId, Long roomId, int page, int size) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));

        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        Users currentUser = getCurrentUser();
        
        // 관리자방은 관리자만 접근 가능
        if (room.isAdminRoom()) {
            if (currentUser == null) {
                throw new ApplicationUnauthorizedException("인증이 필요합니다.");
            }
            // 모임 주인인지 확인
            boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
            if (!isOwner) {
                // 멤버인지 확인
                Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
                if (member.isEmpty() || !member.get().isAdmin()) {
                    throw new ApplicationUnauthorizedException("관리자만 관리자방을 볼 수 있습니다.");
                }
            }
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        List<GroupChatMessage> messages = groupChatMessageRepository.findRecentMessages(roomId, pageable);

        // 모임 주인과 관리자 목록 확인
        Long ownerId = group.getOwner().getId();
        List<Long> adminIds = new ArrayList<>();
        adminIds.add(ownerId); // 모임 주인은 항상 관리자
        try {
            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            adminIds.addAll(members.stream()
                    .filter(GroupMember::isAdmin)
                    .map(m -> m.getUser().getId())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            // 관리자 목록 조회 실패 시 모임 주인만 포함
        }

        final List<Long> finalAdminIds = adminIds;
        return messages.stream().<GroupChatMessageDTO>map(msg -> {
            Long userId = msg.getUser().getId();
            boolean isAdmin = finalAdminIds.contains(userId);
            
            // 채팅방별 별명 조회
            String displayName = null;
            Optional<GroupMember> memberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, msg.getUser().getId());
            if (memberOpt.isPresent()) {
                displayName = memberOpt.get().getDisplayName();
            }
            
            // 답장 정보 처리
            GroupChatMessageDTO.ReplyToMessageInfo replyToMessageInfo = null;
            if (msg.getReplyToMessage() != null) {
                GroupChatMessage replyTo = msg.getReplyToMessage();
                Users replyToUser = replyTo.getUser();
                // 답장한 메시지 작성자의 displayName 조회
                String replyToDisplayName = null;
                Optional<GroupMember> replyToMemberOpt = groupMemberRepository.findByGroupIdAndUserId(groupId, replyToUser.getId());
                if (replyToMemberOpt.isPresent()) {
                    replyToDisplayName = replyToMemberOpt.get().getDisplayName();
                }
                
                replyToMessageInfo = GroupChatMessageDTO.ReplyToMessageInfo.builder()
                        .id(replyTo.getId())
                        .message(replyTo.getMessage())
                        .username(replyToUser.getUsername())
                        .nickname(replyToUser.getNickname())
                        .displayName(replyToDisplayName)
                        .profileImageUrl(replyToUser.getProfileImageUrl())
                        .build();
            }
            
            // 반응 정보 조회
            List<GroupChatMessageDTO.ReactionInfo> reactions = new ArrayList<>();
            try {
                List<Object[]> reactionCounts = messageReactionRepository.countByMessageIdGroupByEmoji(msg.getId());
                for (Object[] row : reactionCounts) {
                    String emoji = (String) row[0];
                    Long count = ((Number) row[1]).longValue();
                    reactions.add(GroupChatMessageDTO.ReactionInfo.builder()
                            .emoji(emoji)
                            .count(count.intValue())
                            .build());
                }
            } catch (Exception e) {
                // 반응 정보 조회 실패 시 빈 리스트
            }

            // 현재 사용자가 추가한 반응 목록
            List<String> myReactions = new ArrayList<>();
            try {
                if (currentUser != null) {
                    myReactions = messageReactionRepository.findEmojisByMessageIdAndUserId(msg.getId(), currentUser.getId());
                }
            } catch (Exception e) {
                // 현재 사용자 반응 조회 실패 시 빈 리스트
            }

            return GroupChatMessageDTO.builder()
                    .id(msg.getId())
                    .message(msg.getMessage())
                    .username(msg.getUser().getUsername())
                    .nickname(msg.getUser().getNickname())
                    .displayName(displayName)  // 채팅방별 별명
                    .profileImageUrl(msg.getUser().getProfileImageUrl())
                    .isAdmin(isAdmin)
                    .createdTime(msg.getCreatedTime())
                    .readCount(msg.getReadCount())
                    .replyToMessageId(msg.getReplyToMessage() != null ? msg.getReplyToMessage().getId() : null)
                    .replyToMessage(replyToMessageInfo)
                    .reactions(reactions)
                    .myReactions(myReactions)
                    .build();
        }).collect(Collectors.toList());
    }

    /** 채팅 메시지 삭제 */
    @Transactional
    public void deleteChatMessage(Long groupId, Long roomId, Long messageId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        GroupChatMessage message = groupChatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다."));

        // 같은 채팅방의 메시지인지 확인
        if (!message.getChatRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("메시지가 해당 채팅방에 없습니다.");
        }

        // 메시지 작성자이거나 관리자인지 확인
        boolean isAuthor = message.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = false;
        
        // 모임 주인인지 확인
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
        boolean isOwner = group.getOwner().getId().equals(currentUser.getId());
        
        if (!isOwner) {
            // 관리자인지 확인
            Optional<GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
            if (member.isPresent()) {
                isAdmin = member.get().isAdmin();
            }
        } else {
            isAdmin = true;
        }

        if (!isAuthor && !isAdmin) {
            throw new ApplicationUnauthorizedException("메시지 작성자이거나 관리자만 삭제할 수 있습니다.");
        }

        // 소프트 삭제
        message.setDeleted(true);
        groupChatMessageRepository.save(message);
    }

    /** 채팅 메시지 반응 추가/제거 */
    @Transactional
    public void toggleReaction(Long groupId, Long roomId, Long messageId, String emoji) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        GroupChatMessage message = groupChatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다."));

        // 같은 채팅방의 메시지인지 확인
        if (!message.getChatRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("메시지가 해당 채팅방에 없습니다.");
        }

        // 모임 멤버인지 확인
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId())) {
            throw new ApplicationUnauthorizedException("모임 멤버만 반응을 추가할 수 있습니다.");
        }

        // 이미 반응이 있는지 확인
        boolean exists = messageReactionRepository.existsByMessageIdAndUserIdAndEmoji(messageId, currentUser.getId(), emoji);
        
        if (exists) {
            // 있으면 제거
            messageReactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, currentUser.getId(), emoji);
        } else {
            // 없으면 추가
            MessageReaction reaction = MessageReaction.builder()
                    .message(message)
                    .user(currentUser)
                    .emoji(emoji)
                    .build();
            messageReactionRepository.save(reaction);
        }
    }
}
