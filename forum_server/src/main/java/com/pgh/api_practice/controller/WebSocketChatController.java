package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.GroupChatMessageDTO;
import com.pgh.api_practice.service.WebSocketChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(
        name = "WebSocket-Chat",
        description = "모임 채팅 WebSocket(STOMP) 메시지 처리"
)
@Controller
@RequiredArgsConstructor
public class WebSocketChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketChatService chatService;

    @Operation(
            summary = "채팅 메시지 전송",
            description = """
                    STOMP 메시지를 통해 채팅 메시지를 전송합니다.
                    
                    - destination: /app/chat/{groupId}/{roomId}/send
                    - payload:
                      - message: 전송할 메시지 (필수)
                      - replyToMessageId: 답장 대상 메시지 ID (선택)
                    
                    - 구독 topic: /topic/chat/{groupId}/{roomId}
                    """
    )
    @MessageMapping("/chat/{groupId}/{roomId}/send")
    public void sendMessage(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @DestinationVariable Long groupId,

            @Parameter(description = "채팅방 ID", required = true, example = "10")
            @DestinationVariable Long roomId,

            @Payload Map<String, String> payload,
            Principal principal
    ) {
        /* 기존 로직 그대로 */
        log.info("========== 메시지 수신 시도 ==========");
        log.info("groupId={}, roomId={}, username={}, payload={}",
                groupId, roomId, principal != null ? principal.getName() : "null", payload);

        try {
            if (principal == null) return;

            String message = payload.get("message");
            if (message == null || message.trim().isEmpty()) return;

            Long replyToMessageId = null;
            Object replyToIdObj = payload.get("replyToMessageId");
            if (replyToIdObj != null) {
                try {
                    replyToMessageId = Long.parseLong(replyToIdObj.toString());
                } catch (NumberFormatException ignored) {}
            }

            GroupChatMessageDTO messageDTO =
                    chatService.saveAndGetMessage(
                            groupId,
                            roomId,
                            message,
                            principal.getName(),
                            replyToMessageId
                    );

            messagingTemplate.convertAndSend(
                    "/topic/chat/" + groupId + "/" + roomId,
                    messageDTO
            );
        } catch (Exception e) {
            if (principal != null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", true);
                error.put("message", "메시지 전송 실패");
                messagingTemplate.convertAndSend(
                        "/user/" + principal.getName() + "/queue/errors",
                        error
                );
            }
        }
    }

    @Operation(
            summary = "타이핑 시작",
            description = """
                    사용자가 타이핑을 시작했음을 알립니다.
                    
                    - destination: /app/chat/{groupId}/{roomId}/typing/start
                    - 구독 topic: /topic/chat/{groupId}/{roomId}/typing
                    """
    )
    @MessageMapping("/chat/{groupId}/{roomId}/typing/start")
    public void startTyping(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", true);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId + "/typing",
                typingData
        );
    }

    @Operation(
            summary = "타이핑 종료",
            description = """
                    사용자가 타이핑을 종료했음을 알립니다.
                    
                    - destination: /app/chat/{groupId}/{roomId}/typing/stop
                    """
    )
    @MessageMapping("/chat/{groupId}/{roomId}/typing/stop")
    public void stopTyping(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal
    ) {
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", false);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId + "/typing",
                typingData
        );
    }

    @Operation(
            summary = "채팅 메시지 읽음 처리",
            description = """
                    채팅 메시지를 읽음 처리합니다.
                    
                    - destination: /app/chat/{groupId}/{roomId}/read
                    - payload:
                      - messageId: 읽은 메시지 ID (필수)
                    
                    - 구독 topic: /topic/chat/{groupId}/{roomId}/read
                    """
    )
    @MessageMapping("/chat/{groupId}/{roomId}/read")
    public void markAsRead(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal
    ) {
        try {
            Object messageIdObj = payload.get("messageId");
            if (messageIdObj == null) return;

            Long messageId = Long.parseLong(messageIdObj.toString());
            chatService.markMessageAsRead(messageId, principal.getName());

            int readCount = chatService.getReadCount(messageId);

            Map<String, Object> readData = new HashMap<>();
            readData.put("messageId", messageId);
            readData.put("username", principal.getName());
            readData.put("readCount", readCount);

            messagingTemplate.convertAndSend(
                    "/topic/chat/" + groupId + "/" + roomId + "/read",
                    readData
            );
        } catch (Exception e) {
            log.error("읽음 처리 오류", e);
        }
    }
}