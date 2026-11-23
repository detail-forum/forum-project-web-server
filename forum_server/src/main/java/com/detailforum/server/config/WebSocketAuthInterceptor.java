package com.detailforum.server.config;

import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.DirectChatRoomRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import com.detailforum.server.repository.UserRepository;
import com.detailforum.server.service.GroupChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    // 구독(/topic)과 전송(/app) 모두 같은 방 번호 규칙을 쓴다. 뒤의 /typing, /read, /send도 같은 방이다.
    private static final Pattern DIRECT_ROOM = Pattern.compile("^/(?:topic|app)/direct/(\\d+)(?:/.*)?$");
    private static final Pattern GROUP_ROOM = Pattern.compile("^/(?:topic|app)/chat/(\\d+)/(\\d+)(?:/.*)?$");

    private final TokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final DirectChatRoomRepository directChatRoomRepository;
    private final GroupChatService groupChatService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        log.debug("STOMP COMMAND = {}", command);

        if (StompCommand.CONNECT.equals(command)) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.error("STOMP CONNECT 실패: Authorization 헤더 없음");
                throw new IllegalArgumentException("WebSocket Authorization 헤더가 없습니다.");
            }

            String token = authHeader.substring(7);

            if (!tokenProvider.validateToken(token) || isRefreshCredential(token)) {
                log.error("STOMP CONNECT 실패: 토큰 유효하지 않음");
                throw new IllegalArgumentException("WebSocket 토큰이 유효하지 않습니다.");
            }

            String username = tokenProvider.getUsername(token);

            Authentication authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );

            accessor.setUser(authentication);
            log.info("STOMP CONNECT 인증 성공: {}", username);
        }

        if (StompCommand.SUBSCRIBE.equals(command) || StompCommand.SEND.equals(command)) {
            Principal user = accessor.getUser();
            String destination = accessor.getDestination();
            if (user == null || !canUseDestination(destination, user.getName())) {
                log.warn("STOMP {} 거부: user={}, destination={}", command, user == null ? null : user.getName(), destination);
                throw new AccessDeniedException("채팅방 접근 권한이 없습니다.");
            }
        }

        return message;
    }

    /** 방 멤버만 구독·전송할 수 있다. 알 수 없는 주소는 막는다. */
    boolean canUseDestination(String destination, String username) {
        if (destination == null) {
            return false;
        }
        Matcher direct = DIRECT_ROOM.matcher(destination);
        if (direct.matches()) {
            Long roomId = Long.valueOf(direct.group(1));
            return userRepository.findByUsername(username)
                    .map(u -> directChatRoomRepository.isParticipant(roomId, u.getId()))
                    .orElse(false);
        }
        Matcher group = GROUP_ROOM.matcher(destination);
        if (group.matches()) {
            return groupChatService.canUseChatRoom(Long.valueOf(group.group(1)), Long.valueOf(group.group(2)), username);
        }
        return false;
    }

    private boolean isRefreshCredential(String token) {
        if (tokenProvider.isRefreshToken(token)) {
            return true;
        }
        return tokenProvider.getTokenType(token) == null
                && refreshTokenRepository.findByRefreshToken(token).isPresent();
    }
}
