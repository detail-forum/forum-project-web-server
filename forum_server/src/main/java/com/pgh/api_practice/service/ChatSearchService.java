package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.ChatSearchMessageDTO;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatSearchService {

    private final GroupChatMessageRepository groupChatMessageRepository;
    private final GroupChatRoomRepository groupChatRoomRepository;
    private final GroupMemberRepository groupMemberRepository;

    private final DirectChatMessageRepository directChatMessageRepository;
    private final DirectChatRoomRepository directChatRoomRepository;

    private final UserRepository userRepository;

    public Page<ChatSearchMessageDTO> search(
            String query,
            String type,
            Long chatRoomId,
            Pageable pageable
    ) {
        Users user = getCurrentUser();

        if ("group".equalsIgnoreCase(type)) {
            return searchGroup(query, chatRoomId, user, pageable);
        }

        if ("direct".equalsIgnoreCase(type)) {
            return searchDirect(query, chatRoomId, user, pageable);
        }

        throw new IllegalArgumentException("type은 direct 또는 group 이어야 합니다.");
    }

    private Page<ChatSearchMessageDTO> searchGroup(
            String query,
            Long roomId,
            Users user,
            Pageable pageable
    ) {
        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        Long groupId = room.getGroup().getId();

        boolean isMember =
                room.getGroup().getOwner().getId().equals(user.getId()) ||
                        groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());

        if (!isMember) {
            throw new ApplicationUnauthorizedException("모임 멤버만 검색할 수 있습니다.");
        }

        return groupChatMessageRepository
                .searchInRoom(roomId, query, pageable)
                .map(m -> ChatSearchMessageDTO.builder()
                        .id(m.getId())
                        .message(m.getMessage())
                        .username(m.getUser().getUsername())
                        .nickname(m.getUser().getNickname())
                        .createdTime(m.getCreatedTime())
                        .messageType(m.getMessageType().name())
                        .build());
    }

    private Page<ChatSearchMessageDTO> searchDirect(
            String query,
            Long roomId,
            Users user,
            Pageable pageable
    ) {
        DirectChatRoom room = directChatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));

        Long userId = user.getId();
        boolean isParticipant =
                userId.equals(room.getUser1Id()) ||
                        userId.equals(room.getUser2Id());

        if (!isParticipant) {
            throw new ApplicationUnauthorizedException("채팅방 참여자만 검색할 수 있습니다.");
        }

        return directChatMessageRepository
                .searchInRoom(roomId, query, pageable)
                .map(m -> {
                    Users sender = userRepository.findById(m.getSenderId())
                            .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

                    return ChatSearchMessageDTO.builder()
                            .id(m.getId())
                            .message(m.getMessage())
                            .username(sender.getUsername())
                            .nickname(sender.getNickname())
                            .createdTime(m.getCreatedTime())
                            .messageType(m.getMessageType().name())
                            .build();
                });
    }

    private Users getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ApplicationUnauthorizedException("사용자를 찾을 수 없습니다."));
    }
}