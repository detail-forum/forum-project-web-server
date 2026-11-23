package com.detailforum.server.service;

import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 요청한 사용자. 서비스마다 SecurityContextHolder를 직접 읽던 것을 여기로 모았다.
 * 로그인이 필요한 경로는 SecurityConfig가 먼저 막으므로, require()의 예외는 마지막 방어선이다.
 */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepository;

    /** 로그인하지 않았으면 null */
    public String username() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return auth.getName();
    }

    /** 로그인하지 않았거나 계정이 없으면 비어 있다 */
    public Optional<Users> find() {
        String username = username();
        return username == null ? Optional.empty() : userRepository.findByUsername(username);
    }

    public Users require() {
        String username = username();
        if (username == null) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
    }
}
