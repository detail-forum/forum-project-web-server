package com.pgh.api_practice.config;

import com.pgh.api_practice.global.TokenProvider;
import com.pgh.api_practice.repository.DirectChatRoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final TokenProvider tokenProvider;
    private final DirectChatRoomRepository directChatRoomRepository;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {

        URI uri = request.getURI();

        String token = UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .getFirst("token");

        if (token == null || !tokenProvider.validateToken(token)) {
            log.warn("WebSocket Handshake 실패: JWT 없음 또는 유효하지 않음");
            return false;
        }

        Long userId = tokenProvider.getUserId(token);
        String username = tokenProvider.getUsername(token);

        String path = uri.getPath();
        String[] segments = path.split("/");
        Long chatRoomId = Long.parseLong(segments[segments.length - 1]);

        boolean isParticipant =
                directChatRoomRepository.isParticipant(chatRoomId, userId);

        if (!isParticipant) {
            log.warn(
                    "WebSocket Handshake 실패: 채팅방 접근 권한 없음 userId={}, roomId={}",
                    userId, chatRoomId
            );
            return false;
        }

        attributes.put("userId", userId);
        attributes.put("username", username);
        attributes.put("chatRoomId", chatRoomId);

        log.info(
                "WebSocket Handshake 성공 userId={}, username={}, roomId={}",
                userId, username, chatRoomId
        );
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }
}