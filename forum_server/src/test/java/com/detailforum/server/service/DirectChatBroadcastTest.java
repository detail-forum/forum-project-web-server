package com.detailforum.server.service;

import com.detailforum.server.dto.DirectChatMessageDTO;
import com.detailforum.server.entity.DirectChatRoom;
import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.DirectChatRoomRepository;
import com.detailforum.server.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@SpringBootTest
@Transactional
class DirectChatBroadcastTest {

    @Autowired private DirectChatService directChatService;
    @Autowired private UserRepository userRepository;
    @Autowired private DirectChatRoomRepository roomRepository;
    @MockitoBean private SimpMessagingTemplate messagingTemplate;

    @Test
    void websocketMessageIsBroadcastToRoomSubscribers() {
        Users alice = save("alice");
        Users bob = save("bob");
        DirectChatRoom room = roomRepository.save(new DirectChatRoom(alice.getId(), bob.getId()));

        directChatService.sendMessageViaWebSocket(room.getId(), "hello", "alice");

        verify(messagingTemplate).convertAndSend(eq("/topic/direct/" + room.getId()),
                argThat((Object payload) -> payload instanceof DirectChatMessageDTO dto && "hello".equals(dto.getMessage())));
    }

    private Users save(String username) {
        return userRepository.save(Users.builder()
                .username(username).password("x").nickname(username).email(username + "@example.com")
                .emailVerified(true).build());
    }
}
