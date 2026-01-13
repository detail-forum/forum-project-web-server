package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.DirectChatMessageDTO;
import com.pgh.api_practice.dto.GroupChatMessageDTO;
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

    // 메시지 전송
    @MessageMapping("/chat/{groupId}/{roomId}/send")
    public void sendMessage(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            @Payload Map<String, String> payload,
            Principal principal) {
        
        log.info("========== 메시지 수신 시도 ==========");
        log.info("groupId={}, roomId={}, username={}, payload={}", 
                groupId, roomId, principal != null ? principal.getName() : "null", payload);
        log.info("Principal 객체: {}", principal);
        
        try {
            if (principal == null) {
                log.error("Principal이 null입니다. 인증이 필요합니다.");
                return;
            }
            
            String message = payload.get("message");
            if (message == null || message.trim().isEmpty()) {
                log.warn("메시지가 비어있습니다.");
                return;
            }

            // 답장 정보 추출
            Long replyToMessageId = null;
            Object replyToIdObj = payload.get("replyToMessageId");
            if (replyToIdObj != null) {
                if (replyToIdObj instanceof Number) {
                    replyToMessageId = ((Number) replyToIdObj).longValue();
                } else {
                    try {
                        replyToMessageId = Long.parseLong(replyToIdObj.toString());
                    } catch (NumberFormatException e) {
                        log.warn("답장 메시지 ID 파싱 실패: {}", replyToIdObj);
                    }
                }
            }

            log.info("메시지 저장 시작: groupId={}, roomId={}, username={}, message={}, replyToMessageId={}", 
                    groupId, roomId, principal.getName(), message, replyToMessageId);
            
            // 메시지 저장 및 DTO 생성 (Principal의 username 전달)
            GroupChatMessageDTO messageDTO = chatService.saveAndGetMessage(groupId, roomId, message, principal.getName(), replyToMessageId);
            
            log.info("메시지 저장 완료: messageId={}, username={}", messageDTO.getId(), messageDTO.getUsername());
            
            String topic = "/topic/chat/" + groupId + "/" + roomId;
            log.info("메시지 브로드캐스트 시작: topic={}, messageDTO={}", topic, messageDTO);
            log.info("메시지 DTO 상세: id={}, message={}, username={}, nickname={}, isAdmin={}",
                    messageDTO.getId(), messageDTO.getMessage(), messageDTO.getUsername(), 
                    messageDTO.getNickname(), messageDTO.isAdmin());
            
            try {
                // 해당 채팅방의 모든 구독자에게 메시지 전송
                messagingTemplate.convertAndSend(topic, messageDTO);
                log.info("convertAndSend 호출 완료: topic={}", topic);
            } catch (Exception e) {
                log.error("convertAndSend 오류: {}", e.getMessage(), e);
                throw e;
            }
            
            log.info("메시지 브로드캐스트 완료: groupId={}, roomId={}, username={}", 
                    groupId, roomId, principal.getName());
        } catch (Exception e) {
            log.error("메시지 전송 오류: groupId={}, roomId={}, username={}, error={}", 
                    groupId, roomId, principal != null ? principal.getName() : "null", e.getMessage(), e);
            // 오류 발생 시 클라이언트에 알림
            if (principal != null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", true);
                error.put("message", "메시지 전송에 실패했습니다: " + e.getMessage());
                messagingTemplate.convertAndSend(
                    "/user/" + principal.getName() + "/queue/errors",
                    error
                );
            }
        }
    }

    // 타이핑 인디케이터 시작
    @MessageMapping("/chat/{groupId}/{roomId}/typing/start")
    public void startTyping(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal) {
        
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", true);
        
        // 본인을 제외한 다른 사용자에게만 전송
        messagingTemplate.convertAndSend(
            "/topic/chat/" + groupId + "/" + roomId + "/typing",
            typingData
        );
    }

    // 타이핑 인디케이터 종료
    @MessageMapping("/chat/{groupId}/{roomId}/typing/stop")
    public void stopTyping(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            Principal principal) {
        
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", false);
        
        messagingTemplate.convertAndSend(
            "/topic/chat/" + groupId + "/" + roomId + "/typing",
            typingData
        );
    }

    // 메시지 읽음 처리
    @MessageMapping("/chat/{groupId}/{roomId}/read")
    public void markAsRead(
            @DestinationVariable Long groupId,
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        
        try {
            Object messageIdObj = payload.get("messageId");
            if (messageIdObj == null) {
                return;
            }
            
            Long messageId;
            if (messageIdObj instanceof Number) {
                messageId = ((Number) messageIdObj).longValue();
            } else {
                messageId = Long.parseLong(messageIdObj.toString());
            }
            
            // 읽음 상태 저장
            chatService.markMessageAsRead(messageId, principal.getName());
            
            // 읽음 수 조회
            int readCount = chatService.getReadCount(messageId);
            
            // 읽음 상태 업데이트 전송
            Map<String, Object> readData = new HashMap<>();
            readData.put("messageId", messageId);
            readData.put("username", principal.getName());
            readData.put("readCount", readCount);
            
            messagingTemplate.convertAndSend(
                "/topic/chat/" + groupId + "/" + roomId + "/read",
                readData
            );
        } catch (Exception e) {
            log.error("읽음 처리 오류: {}", e.getMessage(), e);
        }
    }

    // ========== 일반 채팅 (1대1) WebSocket 엔드포인트 ==========

    // 일반 채팅 메시지 전송
    @MessageMapping("/direct/{roomId}/send")
    public void sendDirectMessage(
            @DestinationVariable Long roomId,
            @Payload Map<String, String> payload,
            Principal principal) {
        
        log.info("========== 일반 채팅 메시지 수신 시도 ==========");
        log.info("roomId={}, username={}, payload={}", 
                roomId, principal != null ? principal.getName() : "null", payload);
        
        try {
            if (principal == null) {
                log.error("Principal이 null입니다. 인증이 필요합니다.");
                return;
            }
            
            String message = payload.get("message");
            if (message == null || message.trim().isEmpty()) {
                log.warn("메시지가 비어있습니다.");
                return;
            }

            log.info("일반 채팅 메시지 저장 시작: roomId={}, username={}, message={}", 
                    roomId, principal.getName(), message);
            
            // 메시지 저장 및 DTO 생성 (WebSocket을 통해 전송)
            DirectChatMessageDTO messageDTO = directChatService.sendMessageViaWebSocket(
                    roomId, message, principal.getName());
            
            log.info("일반 채팅 메시지 저장 완료: messageId={}, username={}", 
                    messageDTO.getId(), messageDTO.getUsername());
            
            String topic = "/topic/direct/" + roomId;
            log.info("일반 채팅 메시지 브로드캐스트 시작: topic={}, messageDTO={}", topic, messageDTO);
            
            try {
                // 해당 채팅방의 모든 구독자에게 메시지 전송
                messagingTemplate.convertAndSend(topic, messageDTO);
                log.info("일반 채팅 convertAndSend 호출 완료: topic={}", topic);
            } catch (Exception e) {
                log.error("일반 채팅 convertAndSend 오류: {}", e.getMessage(), e);
                throw e;
            }
            
            log.info("일반 채팅 메시지 브로드캐스트 완료: roomId={}, username={}", 
                    roomId, principal.getName());
        } catch (Exception e) {
            log.error("일반 채팅 메시지 전송 오류: roomId={}, username={}, error={}", 
                    roomId, principal != null ? principal.getName() : "null", e.getMessage(), e);
            // 오류 발생 시 클라이언트에 알림
            if (principal != null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", true);
                error.put("message", "메시지 전송에 실패했습니다: " + e.getMessage());
                messagingTemplate.convertAndSend(
                    "/user/" + principal.getName() + "/queue/errors",
                    error
                );
            }
        }
    }

    // 일반 채팅 타이핑 인디케이터 시작
    @MessageMapping("/direct/{roomId}/typing/start")
    public void startDirectTyping(
            @DestinationVariable Long roomId,
            Principal principal) {
        
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", true);
        
        messagingTemplate.convertAndSend(
            "/topic/direct/" + roomId + "/typing",
            typingData
        );
    }

    // 일반 채팅 타이핑 인디케이터 종료
    @MessageMapping("/direct/{roomId}/typing/stop")
    public void stopDirectTyping(
            @DestinationVariable Long roomId,
            Principal principal) {
        
        Map<String, Object> typingData = new HashMap<>();
        typingData.put("username", principal.getName());
        typingData.put("isTyping", false);
        
        messagingTemplate.convertAndSend(
            "/topic/direct/" + roomId + "/typing",
            typingData
        );
    }

    // 일반 채팅 메시지 읽음 처리
    @MessageMapping("/direct/{roomId}/read")
    public void markDirectAsRead(
            @DestinationVariable Long roomId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        
        try {
            Object messageIdObj = payload.get("messageId");
            if (messageIdObj == null) {
                return;
            }
            
            Long messageId;
            if (messageIdObj instanceof Number) {
                messageId = ((Number) messageIdObj).longValue();
            } else {
                messageId = Long.parseLong(messageIdObj.toString());
            }
            
            // 읽음 상태 저장
            directChatService.markMessageAsRead(messageId, principal.getName());
            
            // 읽음 상태 업데이트 전송
            Map<String, Object> readData = new HashMap<>();
            readData.put("messageId", messageId);
            readData.put("username", principal.getName());
            readData.put("isRead", true);
            
            messagingTemplate.convertAndSend(
                "/topic/direct/" + roomId + "/read",
                readData
            );
        } catch (Exception e) {
            log.error("일반 채팅 읽음 처리 오류: {}", e.getMessage(), e);
        }
    }
}
