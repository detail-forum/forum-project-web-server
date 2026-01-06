package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.GroupChatMessageDTO;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.errorcode.WebSocketChatErrorCode;
import com.pgh.api_practice.exception.WebSocketChatException;
import com.pgh.api_practice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
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
    private final MessageReactionRepository reactionRepository;

    /** 메시지 저장 */
    @Transactional
    public GroupChatMessageDTO saveAndGetMessage(
            Long groupId,
            Long roomId,
            String messageText,
            String username,
            Long replyToMessageId
    ) {
        if (username == null || username.isBlank()) {
            throw new WebSocketChatException(WebSocketChatErrorCode.UNAUTHORIZED);
        }

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.USER_NOT_FOUND));

        GroupChatRoom room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.CHAT_ROOM_NOT_FOUND));

        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());
        if (!isMember) {
            throw new WebSocketChatException(WebSocketChatErrorCode.GROUP_MEMBER_ONLY);
        }

        if (room.isAdminRoom()) {
            boolean isAdmin = groupMemberRepository
                    .findByGroupIdAndUserId(groupId, user.getId())
                    .map(GroupMember::isAdmin)
                    .orElse(false);

            if (!isAdmin) {
                throw new WebSocketChatException(WebSocketChatErrorCode.ADMIN_ONLY_ROOM);
            }
        }

        GroupChatMessage replyTo = null;
        if (replyToMessageId != null) {
            replyTo = messageRepository.findById(replyToMessageId)
                    .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.MESSAGE_NOT_FOUND));

            if (!replyTo.getChatRoom().getId().equals(roomId)) {
                throw new WebSocketChatException(WebSocketChatErrorCode.INVALID_REPLY_TARGET);
            }
        }

        GroupChatMessage saved = messageRepository.save(
                GroupChatMessage.builder()
                        .chatRoom(room)
                        .user(user)
                        .message(messageText)
                        .replyToMessage(replyTo)
                        .readCount(0)
                        .build()
        );

        return convertToDTO(saved, groupId);
    }

    /** 메시지 읽음 처리 */
    @Transactional
    public void markMessageAsRead(Long messageId, String username) {
        GroupChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.MESSAGE_NOT_FOUND));

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.USER_NOT_FOUND));

        if (!readRepository.existsByMessageIdAndUserId(messageId, user.getId())) {
            readRepository.save(MessageRead.builder()
                    .message(message)
                    .user(user)
                    .build());

            message.setReadCount(message.getReadCount() + 1);
            messageRepository.save(message);
        }
    }

    /** 메시지 DTO 변환 */
    private GroupChatMessageDTO convertToDTO(GroupChatMessage message, Long groupId) {
        Group group = message.getChatRoom().getGroup();
        Long ownerId = group.getOwner().getId();

        List<Long> adminIds = new ArrayList<>();
        adminIds.add(ownerId);
        adminIds.addAll(
                groupMemberRepository.findByGroupId(groupId).stream()
                        .filter(GroupMember::isAdmin)
                        .map(m -> m.getUser().getId())
                        .collect(Collectors.toList())
        );

        boolean isAdmin = adminIds.contains(message.getUser().getId());

        List<GroupChatMessageDTO.ReactionInfo> reactions =
                reactionRepository.countByMessageIdGroupByEmoji(message.getId()).stream()
                        .map(row -> GroupChatMessageDTO.ReactionInfo.builder()
                                .emoji((String) row[0])
                                .count(((Number) row[1]).intValue())
                                .build())
                        .collect(Collectors.toList());

        return GroupChatMessageDTO.builder()
                .id(message.getId())
                .message(message.getMessage())
                .username(message.getUser().getUsername())
                .nickname(message.getUser().getNickname())
                .profileImageUrl(message.getUser().getProfileImageUrl())
                .isAdmin(isAdmin)
                .createdTime(message.getCreatedTime())
                .readCount(message.getReadCount())
                .replyToMessageId(message.getReplyToMessage() != null ? message.getReplyToMessage().getId() : null)
                .reactions(reactions)
                .build();
    }

    /** 반응 토글 */
    @Transactional
    public void toggleReaction(Long messageId, String emoji, String username) {
        GroupChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.MESSAGE_NOT_FOUND));

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new WebSocketChatException(WebSocketChatErrorCode.USER_NOT_FOUND));

        boolean exists = reactionRepository.existsByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);

        if (exists) {
            reactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);
        } else {
            reactionRepository.save(MessageReaction.builder()
                    .message(message)
                    .user(user)
                    .emoji(emoji)
                    .build());
        }
    }

    @Transactional(readOnly = true)
    public int getReadCount(Long messageId) {
        GroupChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new WebSocketChatException(
                        WebSocketChatErrorCode.MESSAGE_NOT_FOUND
                ));

        return message.getReadCount();
    }
}