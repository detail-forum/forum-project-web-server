package com.pgh.api_practice.config;

import com.pgh.api_practice.global.TokenProvider;
import com.pgh.api_practice.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final TokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor == null) {
            return message;
        }
        
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Authorization 헤더에서 토큰 추출
            String authToken = accessor.getFirstNativeHeader("Authorization");
            
            if (authToken != null && authToken.startsWith("Bearer ")) {
                String token = authToken.substring(7);
                
                try {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {

                        String username = (String) accessor.getSessionAttributes().get("username");

                        if (username != null) {
                            Principal principal = new UsernamePasswordAuthenticationToken(
                                    username, null, null
                            );
                            accessor.setUser(principal);
                            log.info("STOMP CONNECT 인증 완료: {}", username);
                        } else {
                            log.warn("STOMP CONNECT 실패: Handshake 인증 정보 없음");
                        }
                    }
                } catch (Exception e) {
                    log.error("WebSocket 연결 인증 오류: {}", e.getMessage(), e);
                }
            } else {
                log.warn("WebSocket 연결 인증 실패: 토큰이 없음");
            }
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            // 메시지 전송 시 Principal 확인
            Principal principal = accessor.getUser();
            if (principal == null) {
                log.error("메시지 전송 시 Principal이 null입니다. destination={}, headers={}", 
                        accessor.getDestination(), accessor.toMap());
            } else {
                log.info("메시지 전송: username={}, destination={}", principal.getName(), accessor.getDestination());
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            // 구독 시 Principal 확인
            Principal principal = accessor.getUser();
            if (principal == null) {
                log.warn("구독 시 Principal이 null입니다. destination={}", accessor.getDestination());
            } else {
                log.info("구독: username={}, destination={}", principal.getName(), accessor.getDestination());
            }
        }
        
        return message;
    }
}
