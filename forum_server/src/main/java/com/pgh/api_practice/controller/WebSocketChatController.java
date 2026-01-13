package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.DirectChatMessageDTO;
import com.pgh.api_practice.dto.GroupChatMessageDTO;
import com.pgh.api_practice.dto.websocket.DirectChatMessageRequest;
import com.pgh.api_practice.dto.websocket.DirectChatMessageResponse;
import com.pgh.api_practice.dto.websocket.DirectChatReadResponse;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.repository.UserRepository;
import com.pgh.api_practice.service.DirectChatService;
import com.pgh.api_practice.service.WebSocketChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketChatService chatService;
    private final DirectChatService directChatService;
    private final UserRepository userRepository;

    /* =========================
       그룹 채팅 MESSAGE
       ========================= */
    @MessageMapping("/chat/{groupId}/{roomId}/send")
    public void sendMessage(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) return;

        String message = (String) payload.get("message");
        if (message == null || message.trim().isEmpty()) return;

        Long replyToMessageId = null;
        Object replyObj = payload.get("replyToMessageId");
        if (replyObj != null) {
            replyToMessageId =
                    (replyObj instanceof Number)
                            ? ((Number) replyObj).longValue()
                            : Long.parseLong(replyObj.toString());
        }

        GroupChatMessageDTO dto =
                chatService.saveAndGetMessage(
                        groupId,
                        roomId,
                        message,
                        principal.getName(),
                        replyToMessageId
                );

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId,
                dto
        );
    }

    /* =========================
       그룹 채팅 TYPING
       ========================= */
    @MessageMapping("/chat/{groupId}/{roomId}/typing/start")
    public void groupTypingStart(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        if (principal == null) return;

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId + "/typing",
                Map.of(
                        "username", principal.getName(),
                        "isTyping", true
                )
        );
    }

    @MessageMapping("/chat/{groupId}/{roomId}/typing/stop")
    public void groupTypingStop(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        if (principal == null) return;

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId + "/typing",
                Map.of(
                        "username", principal.getName(),
                        "isTyping", false
                )
        );
    }

    /* =========================
       그룹 채팅 READ
       ========================= */
    @MessageMapping("/chat/{groupId}/{roomId}/read")
    public void markAsRead(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) return;

        Object messageIdObj = payload.get("messageId");
        if (messageIdObj == null) return;

        Long messageId =
                (messageIdObj instanceof Number)
                        ? ((Number) messageIdObj).longValue()
                        : Long.parseLong(messageIdObj.toString());

        chatService.markMessageAsRead(messageId, principal.getName());
        int readCount = chatService.getReadCount(messageId);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "READ");
        response.put("messageId", messageId);
        response.put("username", principal.getName());
        response.put("readCount", readCount);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId,
                response
        );
    }

    /* =========================
       1:1 채팅 MESSAGE
       ========================= */
    @MessageMapping("/direct/{roomId}/send")
    public void sendDirectMessage(
            @DestinationVariable Long roomId,
            @Payload DirectChatMessageRequest request,
            Principal principal
    ) {
        if (principal == null) return;
        if (!"MESSAGE".equals(request.getType())) return;

        DirectChatMessageDTO saved =
                directChatService.sendMessageViaWebSocket(
                        roomId,
                        request.getMessage(),
                        principal.getName()
                );

        DirectChatMessageResponse response =
                DirectChatMessageResponse.builder()
                        .type("MESSAGE")
                        .id(saved.getId())
                        .chatRoomId(roomId)
                        .message(saved.getMessage())
                        .username(saved.getUsername())
                        .nickname(saved.getNickname())
                        .displayName(null)
                        .profileImageUrl(saved.getProfileImageUrl())
                        .createdTime(saved.getCreatedTime())
                        .messageType(saved.getMessageType().name())
                        .fileUrl(saved.getFileUrl())
                        .fileName(saved.getFileName())
                        .fileSize(saved.getFileSize())
                        .build();

        messagingTemplate.convertAndSend(
                "/topic/direct/" + roomId,
                response
        );
    }

    /* =========================
       1:1 채팅 TYPING
       ========================= */
    @MessageMapping("/direct/{roomId}/typing/start")
    public void directTypingStart(
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        if (principal == null) return;

        messagingTemplate.convertAndSend(
                "/topic/direct/" + roomId + "/typing",
                Map.of(
                        "username", principal.getName(),
                        "isTyping", true
                )
        );
    }

    @MessageMapping("/direct/{roomId}/typing/stop")
    public void directTypingStop(
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        if (principal == null) return;

        messagingTemplate.convertAndSend(
                "/topic/direct/" + roomId + "/typing",
                Map.of(
                        "username", principal.getName(),
                        "isTyping", false
                )
        );
    }

    /* =========================
       1:1 채팅 READ
       ========================= */
    @MessageMapping("/direct/{roomId}/read")
    public void markDirectAsRead(
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        if (principal == null) return;

        Object messageIdObj = payload.get("messageId");
        if (messageIdObj == null) return;

        Long messageId =
                (messageIdObj instanceof Number)
                        ? ((Number) messageIdObj).longValue()
                        : Long.parseLong(messageIdObj.toString());

        directChatService.markMessageAsRead(messageId, principal.getName());
        int readCount = directChatService.getReadCount(messageId);

        Users reader =
                userRepository.findByUsername(principal.getName())
                        .orElseThrow();

        DirectChatReadResponse response =
                DirectChatReadResponse.builder()
                        .type("READ")
                        .chatRoomId(roomId)
                        .userId(reader.getId())
                        .messageId(messageId)
                        .readCount(readCount)
                        .build();

        messagingTemplate.convertAndSend(
                "/topic/direct/" + roomId,
                response
        );
    }
}