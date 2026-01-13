package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.CreateDirectMessageDTO;
import com.pgh.api_practice.dto.DirectChatMessageDTO;
import com.pgh.api_practice.dto.DirectChatMessagePageDTO;
import com.pgh.api_practice.dto.DirectChatRoomDTO;
import com.pgh.api_practice.entity.DirectChatMessage;
import com.pgh.api_practice.entity.DirectChatReadStatus;
import com.pgh.api_practice.entity.DirectChatRoom;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.DirectChatMessageRepository;
import com.pgh.api_practice.repository.DirectChatReadStatusRepository;
import com.pgh.api_practice.repository.DirectChatRoomRepository;
import com.pgh.api_practice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DirectChatService {

    private final DirectChatMessageRepository messageRepository;
    private final DirectChatReadStatusRepository readStatusRepository;
    private final DirectChatRoomRepository roomRepository;
    private final UserRepository userRepository;

    /** 1대1 채팅방 생성 또는 조회 */
    @Transactional
    public DirectChatRoomDTO getOrCreateRoom(Long otherUserId) {
        if (otherUserId == null) {
            throw new IllegalArgumentException("상대 사용자 ID는 필수입니다.");
        }
        
        Users me = getCurrentUser();
        
        // 자기 자신과는 채팅방 생성 불가
        if (me.getId().equals(otherUserId)) {
            throw new IllegalArgumentException("자기 자신과는 채팅방을 만들 수 없습니다.");
        }
        
        Users other = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("상대 사용자를 찾을 수 없습니다: " + otherUserId));

        Long user1 = Math.min(me.getId(), other.getId());
        Long user2 = Math.max(me.getId(), other.getId());

        DirectChatRoom room = roomRepository
                .findByUser1IdAndUser2Id(user1, user2)
                .orElseGet(() -> {
                    DirectChatRoom newRoom = new DirectChatRoom(user1, user2);
                    return roomRepository.save(newRoom);
                });

        return toRoomDTO(room, me.getId());
    }

    /** 내 1대1 채팅방 목록 조회 */
    public List<DirectChatRoomDTO> getMyRooms() {
        try {
            Users me = getCurrentUser();
            if (me == null) {
                log.error("현재 사용자를 찾을 수 없습니다.");
                throw new ResourceNotFoundException("인증이 필요합니다.");
            }

            List<DirectChatRoom> rooms = roomRepository.findMyRooms(me.getId());
            if (rooms == null || rooms.isEmpty()) {
                return List.of();
            }

            return rooms.stream()
                    .map(room -> {
                        try {
                            return toRoomDTO(room, me.getId());
                        } catch (Exception e) {
                            // 개별 채팅방 변환 실패 시 로그만 남기고 건너뛰기
                            log.error("채팅방 변환 실패 (roomId: {}): {}", room.getId(), e.getMessage(), e);
                            return null;
                        }
                    })
                    .filter(dto -> dto != null)
                    .toList();
        } catch (ResourceNotFoundException e) {
            log.error("1대1 채팅방 목록 조회 실패 (인증 오류): {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("1대1 채팅방 목록 조회 실패: {}", e.getMessage(), e);
            throw new RuntimeException("채팅방 목록을 조회하는 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /* =========================
       내부 변환 로직
       ========================= */

    private DirectChatRoomDTO toRoomDTO(DirectChatRoom room, Long myUserId) {
        Long otherUserId = room.getOtherUserId(myUserId);
        Users other = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("상대 사용자를 찾을 수 없습니다: " + otherUserId));

        DirectChatMessage lastMessage =
                messageRepository.findTopByChatRoomOrderByCreatedTimeDesc(room).orElse(null);

        DirectChatReadStatus readStatus =
                readStatusRepository.findByChatRoomAndUserId(room, myUserId)
                        .orElse(null);

        Long lastReadMessageId =
                (readStatus != null && readStatus.getLastReadMessage() != null)
                        ? readStatus.getLastReadMessage().getId()
                        : null;

        int unreadCount = (int) messageRepository.countUnreadMessages(
                room,
                myUserId,
                lastReadMessageId
        );

        return DirectChatRoomDTO.builder()
                .id(room.getId())
                .otherUserId(other.getId())
                .otherUsername(other.getUsername())
                .otherNickname(other.getNickname())
                .otherProfileImageUrl(other.getProfileImageUrl())
                .lastMessage(lastMessage != null ? lastMessage.getMessage() : null)
                .lastMessageTime(lastMessage != null ? lastMessage.getCreatedTime() : null)
                .unreadCount(unreadCount)
                .updatedTime(room.getUpdatedTime())
                .build();
    }

    private Users getCurrentUser() {
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null) {
                log.error("SecurityContext에 인증 정보가 없습니다.");
                throw new ResourceNotFoundException("인증이 필요합니다.");
            }

            String username = authentication.getName();
            if (username == null || "anonymousUser".equals(username)) {
                log.error("인증되지 않은 사용자입니다. username: {}", username);
                throw new ResourceNotFoundException("인증이 필요합니다.");
            }

            return userRepository.findByUsername(username)
                    .orElseThrow(() -> {
                        log.error("인증 사용자 정보를 찾을 수 없습니다: {}", username);
                        return new ResourceNotFoundException("인증 사용자 정보를 찾을 수 없습니다: " + username);
                    });
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("getCurrentUser 실패: {}", e.getMessage(), e);
            throw new ResourceNotFoundException("인증 정보를 확인할 수 없습니다.");
        }
    }

    @Transactional
    public DirectChatMessagePageDTO getMessages(
            Long chatRoomId,
            int page,
            int size
    ) {
        Users me = getCurrentUser();

        DirectChatRoom room = roomRepository.findById(chatRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방이 존재하지 않습니다: " + chatRoomId));

        // 멤버 검증
        if (!room.getUser1Id().equals(me.getId())
                && !room.getUser2Id().equals(me.getId())) {
            throw new ResourceNotFoundException("채팅방 접근 권한이 없습니다.");
        }

        Pageable pageable = PageRequest.of(page, size);

        Page<DirectChatMessage> pageResult =
                messageRepository.findByChatRoomOrderByCreatedTimeDesc(room, pageable);

        DirectChatMessage latestVisibleMessage =
                pageResult.getContent().stream()
                        .max(Comparator.comparing(DirectChatMessage::getId))
                        .orElse(null);

        DirectChatReadStatus myReadStatus =
                readStatusRepository.findByChatRoomAndUserId(room, me.getId())
                        .orElseGet(() ->
                                readStatusRepository.save(
                                        new DirectChatReadStatus(room, me.getId())
                                )
                        );

        if (latestVisibleMessage != null) {
            DirectChatMessage prev = myReadStatus.getLastReadMessage();
            if (prev == null || latestVisibleMessage.getId() > prev.getId()) {
                myReadStatus.updateRead(latestVisibleMessage);
            }
        }

        Long myLastReadMessageId =
                myReadStatus.getLastReadMessage() != null
                        ? myReadStatus.getLastReadMessage().getId()
                        : null;

        Long otherUserId = room.getOtherUserId(me.getId());
        
        // 상대방의 읽음 상태 조회
        DirectChatReadStatus otherReadStatus =
                readStatusRepository.findByChatRoomAndUserId(room, otherUserId)
                        .orElse(null);
        
        Long otherLastReadMessageId =
                (otherReadStatus != null && otherReadStatus.getLastReadMessage() != null)
                        ? otherReadStatus.getLastReadMessage().getId()
                        : null;

        List<DirectChatMessageDTO> content = pageResult
                .map(message ->
                        toMessageDTO(
                                message,
                                me.getId(),
                                myLastReadMessageId,
                                otherLastReadMessageId
                        )
                )
                .getContent();

        return new DirectChatMessagePageDTO(
                content,
                pageResult.getTotalElements(),
                pageResult.getTotalPages()
        );
    }

    private DirectChatMessageDTO toMessageDTO(
            DirectChatMessage message,
            Long myUserId,
            Long myLastReadMessageId,
            Long otherLastReadMessageId
    ) {
        Users sender = userRepository.findById(message.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("발신자를 찾을 수 없습니다: " + message.getSenderId()));

        boolean isRead;

        if (message.getSenderId().equals(myUserId)) {
            // 내가 보낸 메시지: 상대방이 읽었는지 확인
            isRead = otherLastReadMessageId != null
                    && otherLastReadMessageId >= message.getId();
        } else {
            // 상대가 보낸 메시지: 내가 읽었는지 확인
            isRead = myLastReadMessageId != null
                    && myLastReadMessageId >= message.getId();
        }

        return DirectChatMessageDTO.builder()
                .id(message.getId())
                .roomId(message.getChatRoom().getId())
                .senderId(sender.getId())
                .username(sender.getUsername())
                .nickname(sender.getNickname())
                .profileImageUrl(sender.getProfileImageUrl())
                .message(message.getMessage())
                .createdTime(message.getCreatedTime())
                .messageType(message.getMessageType())
                .fileUrl(message.getFileUrl())
                .fileName(message.getFileName())
                .fileSize(message.getFileSize())
                .isRead(isRead)
                .build();
    }

    @Transactional
    public DirectChatMessageDTO sendMessage(
            Long chatRoomId,
            CreateDirectMessageDTO dto
    ) {
        Users me = getCurrentUser();

        DirectChatRoom room = roomRepository.findById(chatRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방이 존재하지 않습니다: " + chatRoomId));

        if (!room.getUser1Id().equals(me.getId())
                && !room.getUser2Id().equals(me.getId())) {
            throw new ResourceNotFoundException("채팅방 접근 권한이 없습니다.");
        }

        DirectChatMessage saved =
                createAndSaveMessage(room, me, dto);

        return toMessageDTOForSend(saved, me.getId());
    }

    private DirectChatMessageDTO toMessageDTOForSend(DirectChatMessage message, Long myUserId) {
        Users sender = userRepository.findById(message.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("발신자를 찾을 수 없습니다: " + message.getSenderId()));

        // 상대방의 읽음 상태 확인
        DirectChatRoom room = message.getChatRoom();
        Long otherUserId = room.getOtherUserId(myUserId);
        DirectChatReadStatus otherReadStatus =
                readStatusRepository.findByChatRoomAndUserId(room, otherUserId)
                        .orElse(null);
        
        Long otherLastReadMessageId =
                (otherReadStatus != null && otherReadStatus.getLastReadMessage() != null)
                        ? otherReadStatus.getLastReadMessage().getId()
                        : null;
        
        // 상대방이 이미 읽었는지 확인
        boolean isRead = otherLastReadMessageId != null
                && otherLastReadMessageId >= message.getId();

        return DirectChatMessageDTO.builder()
                .id(message.getId())
                .roomId(message.getChatRoom().getId())
                .senderId(sender.getId())
                .message(message.getMessage())
                .username(sender.getUsername())
                .nickname(sender.getNickname())
                .profileImageUrl(sender.getProfileImageUrl())
                .createdTime(message.getCreatedTime())
                .messageType(message.getMessageType())
                .fileUrl(message.getFileUrl())
                .fileName(message.getFileName())
                .fileSize(message.getFileSize())
                .isRead(isRead) // 상대방의 읽음 상태 확인
                .build();
    }

    @Transactional(readOnly = true)
    public int getReadCount(Long messageId) {
        DirectChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다."));

        DirectChatRoom room = message.getChatRoom();

        // 1대1 채팅이므로, 상대방 1명이 읽었는지만 판단
        Long senderId = message.getSenderId();

        // sender가 아닌 다른 한 명
        Long otherUserId =
                room.getUser1Id().equals(senderId)
                        ? room.getUser2Id()
                        : room.getUser1Id();

        DirectChatReadStatus readStatus =
                readStatusRepository.findByChatRoomAndUserId(room, otherUserId)
                        .orElse(null);

        if (readStatus == null || readStatus.getLastReadMessage() == null) {
            return 0;
        }

        return readStatus.getLastReadMessage().getId() >= messageId ? 1 : 0;
    }

    private void validateByType(CreateDirectMessageDTO req) {
        if (req.getMessageType() == null) {
            throw new IllegalArgumentException("messageType은 필수입니다.");
        }

        switch (req.getMessageType()) {
            case TEXT -> {
                if (req.getMessage() == null || req.getMessage().isBlank()) {
                    throw new IllegalArgumentException("TEXT 타입은 message가 필요합니다.");
                }
            }
            case IMAGE -> {
                if (req.getFileUrl() == null || req.getFileUrl().isBlank()) {
                    throw new IllegalArgumentException("IMAGE 타입은 fileUrl이 필요합니다.");
                }
            }
            case FILE -> {
                if (req.getFileUrl() == null || req.getFileUrl().isBlank()
                        || req.getFileName() == null || req.getFileName().isBlank()
                        || req.getFileSize() == null || req.getFileSize() <= 0) {
                    throw new IllegalArgumentException("FILE 타입은 fileUrl, fileName, fileSize가 필요합니다.");
                }
            }
        }
    }

    /** WebSocket을 통해 메시지 전송 (WebSocket 엔드포인트에서 호출) */
    @Transactional
    public DirectChatMessageDTO sendMessageViaWebSocket(
            Long chatRoomId,
            String messageText,
            String username
    ) {
        Users me = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다: " + username));

        DirectChatRoom room = roomRepository.findById(chatRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("채팅방이 존재하지 않습니다: " + chatRoomId));

        if (!room.getUser1Id().equals(me.getId())
                && !room.getUser2Id().equals(me.getId())) {
            throw new ResourceNotFoundException("채팅방 접근 권한이 없습니다.");
        }

        CreateDirectMessageDTO dto = new CreateDirectMessageDTO();
        dto.setMessageType(CreateDirectMessageDTO.MessageType.TEXT);
        dto.setMessage(messageText);

        DirectChatMessage saved =
                createAndSaveMessage(room, me, dto);

        return toMessageDTOForSend(saved, me.getId());
    }

    /** 일반 채팅 메시지 읽음 처리 */
    @Transactional
    public void markMessageAsRead(Long messageId, String username) {
        DirectChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("메시지를 찾을 수 없습니다: " + messageId));

        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다: " + username));

        DirectChatRoom room = message.getChatRoom();

        // 채팅방 멤버인지 확인
        if (!room.getUser1Id().equals(user.getId())
                && !room.getUser2Id().equals(user.getId())) {
            throw new ResourceNotFoundException("채팅방 접근 권한이 없습니다.");
        }

        // 읽음 상태 업데이트
        DirectChatReadStatus readStatus = readStatusRepository
                .findByChatRoomAndUserId(room, user.getId())
                .orElseGet(() ->
                        readStatusRepository.save(
                                new DirectChatReadStatus(room, user.getId())
                        )
                );

        // 이전에 읽은 메시지보다 새로운 메시지인 경우에만 업데이트
        DirectChatMessage prevReadMessage = readStatus.getLastReadMessage();
        if (prevReadMessage == null || message.getId() > prevReadMessage.getId()) {
            readStatus.updateRead(message);
            readStatusRepository.save(readStatus);
        }
    }

    private DirectChatMessage createAndSaveMessage(
            DirectChatRoom room,
            Users sender,
            CreateDirectMessageDTO dto
    ) {
        validateByType(dto);

        DirectChatMessage message = new DirectChatMessage(
                room,
                sender.getId(),
                dto.getMessage(),
                DirectChatMessage.MessageType.valueOf(dto.getMessageType().name()),
                dto.getFileUrl(),
                dto.getFileName(),
                dto.getFileSize()
        );

        DirectChatMessage saved = messageRepository.save(message);

        DirectChatReadStatus readStatus = readStatusRepository
                .findByChatRoomAndUserId(room, sender.getId())
                .orElseGet(() ->
                        readStatusRepository.save(
                                new DirectChatReadStatus(room, sender.getId())
                        )
                );

        readStatus.updateRead(saved);
        readStatusRepository.save(readStatus);

        return saved;
    }
}