package com.detailforum.server.service;

import com.detailforum.server.dto.auth.RegisterRequestDTO;
import com.detailforum.server.exception.UserAlreadyExistException;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.AuthRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRegisterTest {

    @Mock private AuthRepository authRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private TokenProvider tokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private EmailService emailService;

    @Test
    void concurrentDuplicateSignupIsReportedAsAlreadyExists() {
        AuthService authService = new AuthService(authRepository, passwordEncoder, tokenProvider,
                authenticationManager, refreshTokenRepository, emailService);
        RegisterRequestDTO dto = new RegisterRequestDTO("same", "password1", "same", "same@example.com");
        // 사전 검사는 통과했지만 다른 요청이 먼저 저장해 DB 유니크 제약에 걸린 상황
        when(authRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> authService.register(dto)).isInstanceOf(UserAlreadyExistException.class);
        verify(emailService, never()).sendVerificationEmail(anyString(), anyString(), anyString());
    }
}
