package com.detailforum.server.controller;

import com.detailforum.server.dto.websocket.DirectChatMessageRequest;
import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.UserRepository;
import com.detailforum.server.service.DirectChatService;
import com.detailforum.server.service.WebSocketChatService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WebSocketChatControllerTest {

    private final SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
    private final DirectChatService directChatService = mock(DirectChatService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final WebSocketChatController controller = new WebSocketChatController(
            messagingTemplate, mock(WebSocketChatService.class), directChatService, userRepository);

    @Test
    void directMessageFromFrontendIsDelivered() {
        // useDirectWebSocket은 {message}만 보낸다 (type 없음)
        DirectChatMessageRequest request = new DirectChatMessageRequest();
        request.setMessage("hello");

        controller.sendDirectMessage(7L, request, () -> "alice");

        verify(directChatService).sendMessageViaWebSocket(7L, "hello", "alice");
    }

    @Test
    void anonymousDirectMessageIsIgnored() {
        DirectChatMessageRequest request = new DirectChatMessageRequest();
        request.setMessage("hello");

        controller.sendDirectMessage(7L, request, null);

        verifyNoInteractions(directChatService);
    }

    @Test
    void readReceiptGoesToReadTopicNotMessageTopic() {
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(Users.builder().id(1L).username("alice").build()));

        controller.markDirectAsRead(7L, Map.of("messageId", 42), () -> "alice");

        verify(messagingTemplate).convertAndSend(eq("/topic/direct/7/read"), any(Object.class));
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/direct/7"), any(Object.class));
    }
}
