package com.detailforum.server.service;

import com.detailforum.server.entity.Users;
import com.detailforum.server.repository.AuthRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AuthRepository authRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Users u = authRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));

        // DB에 저장된 해시(passwordEncoder.encode(...))를 그대로 사용
        return User.withUsername(u.getUsername())
                .password(u.getPassword())
                .authorities("ROLE_" + (u.getRole() == null ? Users.Role.USER : u.getRole()).name())
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(u.isSuspended())
                .build();
    }
}
