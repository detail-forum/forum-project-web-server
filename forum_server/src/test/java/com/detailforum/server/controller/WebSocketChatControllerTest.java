package com.detailforum.server.controller;

import com.detailforum.server.dto.websocket.DirectChatMessageRequest;
import com.detailforum.server.repository.UserRepository;
import com.detailforum.server.service.DirectChatService;
import com.detailforum.server.service.WebSocketChatService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.mockito.Mockito.*;

class WebSocketChatControllerTest {

    private final DirectChatService directChatService = mock(DirectChatService.class);
    private final WebSocketChatController controller = new WebSocketChatController(
            mock(SimpMessagingTemplate.class), mock(WebSocketChatService.class), directChatService, mock(UserRepository.class));

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
}
