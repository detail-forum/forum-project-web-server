package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.GroupChatMessageDTO;
import com.pgh.api_practice.entity.GroupChatMessage;
import com.pgh.api_practice.entity.GroupChatRoom;
import com.pgh.api_practice.entity.MessageRead;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.GroupChatMessageRepository;
import com.pgh.api_practice.repository.GroupChatRoomRepository;
import com.pgh.api_practice.repository.GroupMemberRepository;
import com.pgh.api_practice.repository.MessageReadRepository;
import com.pgh.api_practice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketChatService {

    private final GroupChatMessageRepository messageRepository;
    private final GroupChatRoomRepository roomRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final MessageReadRepository readRepository;
    private final UserRepository userRepository;

    /** 현재 사용자 가져오기 */
    private Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    /** 메시지 저장 및 DTO 반환 */
    @Transactional
    public GroupChatMessageDTO saveAndGetMessage(Long groupId, Long roomId, String messageText) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }

        GroupChatRoom room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        // 모임 멤버인지 확인
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId())) {
            throw new ApplicationUnauthorizedException("모임 멤버만 메시지를 전송할 수 있습니다.");
        }

        // 관리자방은 관리자만 접근 가능
        if (room.isAdminRoom()) {
            Optional<com.pgh.api_practice.entity.GroupMember> member = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
            if (member.isEmpty() || !member.get().isAdmin()) {
                throw new ApplicationUnauthorizedException("관리자만 관리자방에 메시지를 전송할 수 있습니다.");
            }
        }

        GroupChatMessage message = GroupChatMessage.builder()
                .chatRoom(room)
                .user(currentUser)
                .message(messageText)
                .readCount(0)
                .build();

        GroupChatMessage saved = messageRepository.save(message);
        return convertToDTO(saved, groupId);
    }

    /** 메시지 읽음 처리 */
    @Transactional
    public void markMessageAsRead(Long messageId, String username) {
        GroupChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다."));

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        // 이미 읽음 상태인지 확인
        if (!readRepository.existsByMessageIdAndUserId(messageId, user.getId())) {
            MessageRead read = MessageRead.builder()
                    .message(message)
                    .user(user)
                    .build();
            readRepository.save(read);

            // 읽음 수 업데이트
            message.setReadCount(message.getReadCount() + 1);
            messageRepository.save(message);
        }
    }

    /** 읽음 수 조회 */
    public int getReadCount(Long messageId) {
        return readRepository.countByMessageId(messageId);
    }

    /** 메시지를 DTO로 변환 */
    private GroupChatMessageDTO convertToDTO(GroupChatMessage message, Long groupId) {
        // 모임 주인과 관리자 목록 확인
        com.pgh.api_practice.entity.Group group = message.getChatRoom().getGroup();
        Long ownerId = group.getOwner().getId();
        List<Long> adminIds = new ArrayList<>();
        adminIds.add(ownerId); // 모임 주인은 항상 관리자
        
        try {
            List<com.pgh.api_practice.entity.GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            adminIds.addAll(members.stream()
                    .filter(com.pgh.api_practice.entity.GroupMember::isAdmin)
                    .map(m -> m.getUser().getId())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.warn("관리자 목록 조회 실패: {}", e.getMessage());
        }

        Long userId = message.getUser().getId();
        boolean isAdmin = adminIds.contains(userId);

        return GroupChatMessageDTO.builder()
                .id(message.getId())
                .message(message.getMessage())
                .username(message.getUser().getUsername())
                .nickname(message.getUser().getNickname())
                .profileImageUrl(message.getUser().getProfileImageUrl())
                .isAdmin(isAdmin)
                .createdTime(message.getCreatedTime())
                .readCount(message.getReadCount())
                .build();
    }
}
