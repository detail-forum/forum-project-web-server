package com.detailforum.server.service;

import com.detailforum.server.dto.CreateGroupChatMessageDTO;
import com.detailforum.server.dto.CreateGroupChatRoomDTO;
import com.detailforum.server.dto.GroupChatMessageDTO;
import com.detailforum.server.dto.GroupChatRoomDTO;
import com.detailforum.server.dto.GroupChatRoomListDTO;
import com.detailforum.server.dto.UpdateGroupChatRoomDTO;
import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupChatMessage;
import com.detailforum.server.entity.GroupChatReadStatus;
import com.detailforum.server.entity.GroupChatRoom;
import com.detailforum.server.entity.GroupMember;
import com.detailforum.server.entity.MessageReaction;
import com.detailforum.server.entity.MessageType;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationBadRequestException;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.GroupChatMessageRepository;
import com.detailforum.server.repository.GroupChatReadStatusRepository;
import com.detailforum.server.repository.GroupChatRoomRepository;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.MessageReactionRepository;
import com.detailforum.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 모임 채팅: 채팅방, 메시지, 반응, 읽음 상태.
 * 관리자방은 모임 관리자(주인 포함)만 보고 쓸 수 있다.
 */
@Service
@RequiredArgsConstructor
public class GroupChatService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupChatRoomRepository groupChatRoomRepository;
    private final GroupChatMessageRepository groupChatMessageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final GroupChatReadStatusRepository groupChatReadStatusRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final GroupAccess access;

    /** 모임의 채팅방 목록. 관리자가 아니면 관리자방은 뺀다 */
    @Transactional(readOnly = true)
    public List<GroupChatRoomDTO> getChatRooms(Long groupId) {
        Group group = findGroup(groupId);
        boolean admin = currentUser.find().map(u -> access.isAdmin(group, u)).orElse(false);

        return groupChatRoomRepository.findByGroupIdAndIsDeletedFalseOrderByCreatedTimeAsc(groupId).stream()
                .filter(room -> admin || !room.isAdminRoom())
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

    /** 내가 속한 모든 모임의 채팅방과 마지막 메시지, 안 읽은 수. 최근 대화가 위로 */
    @Transactional(readOnly = true)
    public List<GroupChatRoomListDTO> getMyGroupChatRooms() {
        Users user = currentUser.require();

        List<Long> groupIds = new ArrayList<>();
        groupRepository.findByOwnerIdAndIsDeletedFalse(user.getId()).forEach(g -> groupIds.add(g.getId()));
        groupMemberRepository.findByUserId(user.getId()).forEach(m -> groupIds.add(m.getGroup().getId()));
        List<Long> distinctGroupIds = groupIds.stream().distinct().toList();
        if (distinctGroupIds.isEmpty()) {
            return List.of();
        }

        List<GroupChatRoom> rooms = groupChatRoomRepository.findByGroupIdInAndIsDeletedFalse(distinctGroupIds).stream()
                .filter(room -> !room.isAdminRoom() || access.isAdmin(room.getGroup(), user))
                .toList();
        if (rooms.isEmpty()) {
            return List.of();
        }
        List<Long> roomIds = rooms.stream().map(GroupChatRoom::getId).toList();

        Map<Long, GroupChatMessage> lastMessageMap = groupChatMessageRepository.findLastMessagesByRoomIds(roomIds).stream()
                .collect(Collectors.toMap(m -> m.getChatRoom().getId(), m -> m));
        Map<Long, Long> lastReadMap = groupChatReadStatusRepository.findByUserIdAndChatRoomIdIn(user.getId(), roomIds).stream()
                .collect(Collectors.toMap(
                        rs -> rs.getChatRoom().getId(),
                        rs -> rs.getLastReadMessageId() == null ? 0L : rs.getLastReadMessageId()));

        return rooms.stream()
                .map(room -> {
                    GroupChatMessage last = lastMessageMap.get(room.getId());
                    long unreadCount = groupChatReadStatusRepository.countUnreadMessage(
                            room.getId(), user.getId(), lastReadMap.getOrDefault(room.getId(), 0L));
                    return GroupChatRoomListDTO.builder()
                            .groupId(room.getGroup().getId())
                            .groupName(room.getGroup().getName())
                            .roomId(room.getId())
                            .roomName(room.getName())
                            .roomProfileImageUrl(room.getProfileImageUrl())
                            .lastMessage(last != null ? last.getMessage() : null)
                            .lastMessageTime(last != null ? last.getCreatedTime() : null)
                            .unreadCount((int) unreadCount)
                            .build();
                })
                .sorted(Comparator.comparing(GroupChatRoomListDTO::getLastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional
    public Long createChatRoom(Long groupId, CreateGroupChatRoomDTO dto) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        if (!access.isAdmin(group, user)) {
            throw new ApplicationUnauthorizedException("모임 관리자만 채팅방을 생성할 수 있습니다.");
        }
        GroupChatRoom room = GroupChatRoom.builder()
                .group(group)
                .name(dto.getName())
                .description(dto.getDescription())
                .isAdminRoom(false)
                .build();
        return groupChatRoomRepository.save(room).getId();
    }

    @Transactional
    public void updateChatRoom(Long groupId, Long roomId, UpdateGroupChatRoomDTO dto) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        GroupChatRoom room = findRoom(roomId);
        if (!access.isAdmin(group, user)) {
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

    /** 관리자 권한이 있는 멤버만 지울 수 있다. 기본 채팅방(관리자방, 일반방)은 지울 수 없다 */
    @Transactional
    public void deleteChatRoom(Long groupId, Long roomId) {
        Users user = currentUser.require();
        findGroup(groupId);
        GroupChatRoom room = findRoom(roomId);
        boolean memberAdmin = groupMemberRepository.findByGroupIdAndUserId(groupId, user.getId())
                .map(GroupMember::isAdmin)
                .orElse(false);
        if (!memberAdmin) {
            throw new ApplicationUnauthorizedException("모임 관리자만 채팅방을 삭제할 수 있습니다.");
        }
        if (room.isAdminRoom() || "일반방".equals(room.getName())) {
            throw new IllegalStateException("기본 채팅방은 삭제할 수 없습니다.");
        }
        room.setDeleted(true);
        groupChatRoomRepository.save(room);
    }

    /** REST로 보내는 메시지 (첨부 포함). 웹소켓 전송은 WebSocketChatService가 맡는다 */
    @Transactional
    public Long sendChatMessage(Long groupId, Long roomId, CreateGroupChatMessageDTO dto) {
        Users user = currentUser.require();
        Group group = findGroup(groupId);
        GroupChatRoom room = findRoom(roomId);

        if (!access.isMember(groupId, user.getId()) && !access.isOwner(group, user)) {
            throw new ApplicationUnauthorizedException("모임 멤버만 메시지를 전송할 수 있습니다.");
        }
        if (room.isAdminRoom() && !access.isAdmin(group, user)) {
            throw new ApplicationUnauthorizedException("관리자만 관리자방에 접근할 수 있습니다.");
        }

        GroupChatMessage reply = null;
        if (dto.getReplyToMessageId() != null) {
            reply = groupChatMessageRepository.findById(dto.getReplyToMessageId())
                    .orElseThrow(() -> new ResourceNotFoundException("답장할 메시지를 찾을 수 없습니다."));
            if (!reply.getChatRoom().getId().equals(roomId)) {
                throw new IllegalArgumentException("다른 채팅방 메시지에는 답장할 수 없습니다.");
            }
        }

        MessageType type = dto.getMessageType() != null ? dto.getMessageType() : MessageType.TEXT;
        switch (type) {
            case TEXT -> {
                if (dto.getMessage() == null || dto.getMessage().trim().isEmpty()) {
                    throw new ApplicationBadRequestException("TEXT 메시지는 message가 필수입니다.");
                }
            }
            case IMAGE -> {
                if (dto.getFileUrl() == null || dto.getFileUrl().isBlank()) {
                    throw new ApplicationBadRequestException("IMAGE 메시지는 fileUrl이 필수입니다.");
                }
            }
            case FILE -> {
                if (dto.getFileUrl() == null || dto.getFileName() == null || dto.getFileSize() == null) {
                    throw new ApplicationBadRequestException("FILE 메시지는 fileUrl, fileName, fileSize가 필수입니다.");
                }
            }
        }

        return groupChatMessageRepository.save(GroupChatMessage.builder()
                .chatRoom(room)
                .user(user)
                .message(dto.getMessage())
                .messageType(type)
                .fileUrl(dto.getFileUrl())
                .fileName(dto.getFileName())
                .fileSize(dto.getFileSize())
                .replyToMessage(reply)
                .build()).getId();
    }

    /** 메시지 목록. 불러온 마지막 메시지까지 읽음으로 기록한다 */
    @Transactional
    public List<GroupChatMessageDTO> getChatMessages(Long groupId, Long roomId, int page, int size) {
        Group group = findGroup(groupId);
        GroupChatRoom room = findRoom(roomId);
        Users user = currentUser.require();

        if (!room.getGroup().getId().equals(groupId)) {
            throw new ApplicationBadRequestException("채팅방이 해당 모임에 속하지 않습니다.");
        }
        if (!access.isMember(groupId, user.getId())) {
            throw new ApplicationUnauthorizedException("모임 멤버만 채팅방을 조회할 수 있습니다.");
        }
        if (room.isAdminRoom() && !access.isAdmin(group, user)) {
            throw new ApplicationUnauthorizedException("관리자만 관리자 채팅방을 조회할 수 있습니다.");
        }

        List<GroupChatMessage> messages = groupChatMessageRepository.findMessagesAsc(roomId, PageWindows.request(page, size));
        if (messages.isEmpty()) {
            return List.of();
        }

        GroupChatReadStatus readStatus = groupChatReadStatusRepository.findByUserIdAndChatRoomId(user.getId(), roomId)
                .orElseGet(() -> GroupChatReadStatus.builder().user(user).chatRoom(room).build());
        readStatus.setLastReadMessageId(messages.get(messages.size() - 1).getId());
        groupChatReadStatusRepository.save(readStatus);

        List<Long> messageIds = messages.stream().map(GroupChatMessage::getId).filter(Objects::nonNull).toList();

        // 채팅방 별명과 관리자 표시
        Map<Long, String> displayNameMap = new HashMap<>();
        Set<Long> adminIds = new HashSet<>();
        for (GroupMember gm : groupMemberRepository.findByGroupId(groupId)) {
            if (gm == null || gm.getUser() == null || gm.getUser().getId() == null) continue;
            displayNameMap.putIfAbsent(gm.getUser().getId(), gm.getDisplayName() != null ? gm.getDisplayName() : "");
            if (gm.isAdmin()) adminIds.add(gm.getUser().getId());
        }
        if (group.getOwner() != null && group.getOwner().getId() != null) {
            adminIds.add(group.getOwner().getId());
        }

        // 반응 집계: [messageId, emoji, count]. DB마다 숫자 타입이 달라 Number로 받는다
        Map<Long, List<GroupChatMessageDTO.ReactionInfo>> reactionCountMap = new HashMap<>();
        messageReactionRepository.countByMessageIdsGroupByEmoji(messageIds).forEach(row -> {
            if (row == null || row.length < 3) return;
            Long msgId = row[0] instanceof Number n ? n.longValue() : null;
            String emoji = row[1] != null ? row[1].toString() : null;
            int count = row[2] instanceof Number n ? n.intValue() : 0;
            if (msgId == null || emoji == null) return;
            reactionCountMap.computeIfAbsent(msgId, k -> new ArrayList<>()).add(new GroupChatMessageDTO.ReactionInfo(emoji, count));
        });

        // 내가 단 반응: [messageId, emoji]
        Map<Long, List<String>> myReactionMap = new HashMap<>();
        messageReactionRepository.findMyReactions(messageIds, user.getId()).forEach(row -> {
            if (row == null || row.length < 2) return;
            Long msgId = row[0] instanceof Number n ? n.longValue() : null;
            String emoji = row[1] != null ? row[1].toString() : null;
            if (msgId == null || emoji == null) return;
            myReactionMap.computeIfAbsent(msgId, k -> new ArrayList<>()).add(emoji);
        });

        return messages.stream()
                .map(msg -> toDto(msg, displayNameMap, adminIds, reactionCountMap, myReactionMap))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /** 작성자 없는 메시지는 null (목록에서 뺀다) */
    private GroupChatMessageDTO toDto(GroupChatMessage msg, Map<Long, String> displayNameMap, Set<Long> adminIds,
                                      Map<Long, List<GroupChatMessageDTO.ReactionInfo>> reactionCountMap,
                                      Map<Long, List<String>> myReactionMap) {
        Users author = msg.getUser();
        if (author == null || author.getId() == null) {
            return null;
        }

        GroupChatMessageDTO.ReplyToMessageInfo replyInfo = null;
        GroupChatMessage reply = msg.getReplyToMessage();
        if (reply != null && reply.getUser() != null && reply.getUser().getId() != null) {
            Users replyUser = reply.getUser();
            replyInfo = GroupChatMessageDTO.ReplyToMessageInfo.builder()
                    .id(reply.getId())
                    .message(reply.getMessage())
                    .username(replyUser.getUsername())
                    .nickname(replyUser.getNickname())
                    .displayName(displayNameMap.get(replyUser.getId()))
                    .profileImageUrl(replyUser.getProfileImageUrl())
                    .build();
        }

        return GroupChatMessageDTO.builder()
                .id(msg.getId())
                .message(msg.getMessage())
                .messageType(msg.getMessageType())
                .fileUrl(msg.getFileUrl())
                .fileName(msg.getFileName())
                .fileSize(msg.getFileSize())
                .username(author.getUsername())
                .nickname(author.getNickname())
                .displayName(displayNameMap.get(author.getId()))
                .profileImageUrl(author.getProfileImageUrl())
                .isAdmin(adminIds.contains(author.getId()))
                .createdTime(msg.getCreatedTime())
                .replyToMessageId(reply != null ? reply.getId() : null)
                .replyToMessage(replyInfo)
                .reactions(reactionCountMap.getOrDefault(msg.getId(), List.of()))
                .myReactions(myReactionMap.getOrDefault(msg.getId(), List.of()))
                .build();
    }

    /** 작성자나 관리자(주인 포함)만 지울 수 있다 (소프트 삭제) */
    @Transactional
    public void deleteChatMessage(Long groupId, Long roomId, Long messageId) {
        Users user = currentUser.require();
        GroupChatMessage message = findMessageInRoom(messageId, roomId);
        Group group = findGroup(groupId);

        boolean isAuthor = message.getUser().getId().equals(user.getId());
        if (!isAuthor && !access.isAdmin(group, user)) {
            throw new ApplicationUnauthorizedException("메시지 작성자이거나 관리자만 삭제할 수 있습니다.");
        }
        message.setDeleted(true);
        groupChatMessageRepository.save(message);
    }

    /** 같은 이모지를 다시 누르면 취소된다 */
    @Transactional
    public void toggleReaction(Long groupId, Long roomId, Long messageId, String emoji) {
        Users user = currentUser.require();
        GroupChatMessage message = findMessageInRoom(messageId, roomId);
        if (!access.isMember(groupId, user.getId())) {
            throw new ApplicationUnauthorizedException("모임 멤버만 반응을 추가할 수 있습니다.");
        }

        if (messageReactionRepository.existsByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji)) {
            messageReactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);
        } else {
            messageReactionRepository.save(MessageReaction.builder().message(message).user(user).emoji(emoji).build());
        }
    }

    /** 웹소켓 구독·전송 권한. REST 조회(getChatMessages)와 같은 규칙이다. */
    @Transactional(readOnly = true)
    public boolean canUseChatRoom(Long groupId, Long roomId, String username) {
        Users user = userRepository.findByUsername(username).orElse(null);
        GroupChatRoom room = groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId).orElse(null);
        if (user == null || room == null) return false;
        Group group = room.getGroup();
        if (group.isDeleted() || !group.getId().equals(groupId)) return false;
        if (!access.isMember(groupId, user.getId())) return false;
        return !room.isAdminRoom() || access.isAdmin(group, user);
    }

    private Group findGroup(Long groupId) {
        return groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
    }

    private GroupChatRoom findRoom(Long roomId) {
        return groupChatRoomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방을 찾을 수 없습니다."));
    }

    private GroupChatMessage findMessageInRoom(Long messageId, Long roomId) {
        GroupChatMessage message = groupChatMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다."));
        if (!message.getChatRoom().getId().equals(roomId)) {
            throw new IllegalArgumentException("메시지가 해당 채팅방에 없습니다.");
        }
        return message;
    }
}
