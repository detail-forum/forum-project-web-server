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
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Authorization 헤더에서 토큰 추출
            String authToken = accessor.getFirstNativeHeader("Authorization");
            
            if (authToken != null && authToken.startsWith("Bearer ")) {
                String token = authToken.substring(7);
                
                try {
                    if (tokenProvider.validateToken(token)) {
                        String username = tokenProvider.getUsername(token);
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        
                        Principal principal = new UsernamePasswordAuthenticationToken(
                            username, null, userDetails.getAuthorities()
                        );
                        accessor.setUser(principal);
                        log.info("WebSocket 연결 인증 성공: {}", username);
                    } else {
                        log.warn("WebSocket 연결 인증 실패: 유효하지 않은 토큰");
                    }
                } catch (Exception e) {
                    log.error("WebSocket 연결 인증 오류: {}", e.getMessage());
                }
            } else {
                log.warn("WebSocket 연결 인증 실패: 토큰이 없음");
            }
        }
        
        return message;
    }
}
