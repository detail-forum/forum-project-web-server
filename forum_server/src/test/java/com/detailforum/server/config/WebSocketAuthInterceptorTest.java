package com.detailforum.server.config;

import com.detailforum.server.entity.Users;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.DirectChatRoomRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import com.detailforum.server.repository.UserRepository;
import com.detailforum.server.service.GroupChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock private TokenProvider tokenProvider;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private UserRepository userRepository;
    @Mock private DirectChatRoomRepository directChatRoomRepository;
    @Mock private GroupChatService groupChatService;

    private WebSocketAuthInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthInterceptor(tokenProvider, refreshTokenRepository,
                userRepository, directChatRoomRepository, groupChatService);
    }

    @Test
    void outsiderCannotSubscribeToSomeoneElsesDirectRoom() {
        Users outsider = Users.builder().id(3L).username("outsider").build();
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(directChatRoomRepository.isParticipant(7L, 3L)).thenReturn(false);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/direct/7", "outsider"), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void participantCanSubscribeToTypingOfOwnDirectRoom() {
        Users me = Users.builder().id(1L).username("me").build();
        when(userRepository.findByUsername("me")).thenReturn(Optional.of(me));
        when(directChatRoomRepository.isParticipant(7L, 1L)).thenReturn(true);

        Message<?> message = frame(StompCommand.SUBSCRIBE, "/topic/direct/7/typing", "me");
        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    @Test
    void groupSendIsCheckedAgainstTheRoomAndGroup() {
        when(groupChatService.canUseChatRoom(2L, 9L, "me")).thenReturn(false);

        assertThatThrownBy(() -> interceptor.preSend(frame(StompCommand.SEND, "/app/chat/2/9/typing/start", "me"), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void unknownDestinationIsRejected() {
        assertThat(interceptor.canUseDestination("/topic/everything", "me")).isFalse();
    }

    private static Message<byte[]> frame(StompCommand command, String destination, String username) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser(new UsernamePasswordAuthenticationToken(username, null, List.of()));
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
