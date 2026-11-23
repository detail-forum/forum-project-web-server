package com.detailforum.server.controller;

import com.detailforum.server.dto.DirectChatMessageDTO;
import com.detailforum.server.dto.GroupChatMessageDTO;
import com.detailforum.server.dto.websocket.DirectChatMessageRequest;
import com.detailforum.server.dto.websocket.DirectChatMessageResponse;
import com.detailforum.server.dto.websocket.DirectChatReadResponse;
import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.UserRepository;
import com.detailforum.server.service.DirectChatService;
import com.detailforum.server.service.WebSocketChatService;
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

        chatService.sendMessageViaWebSocket(
                groupId,
                roomId,
                message,
                principal.getName(),
                replyToMessageId
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

        directChatService.sendMessageViaWebSocket(
                roomId,
                request.getMessage(),
                principal.getName()
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