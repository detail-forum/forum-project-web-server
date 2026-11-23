package com.detailforum.server.service;

import com.detailforum.server.entity.Users;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.AuthRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock
    private AuthRepository authRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TokenProvider tokenProvider;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(authRepository, passwordEncoder, tokenProvider,
                authenticationManager, refreshTokenRepository, emailService);
    }

    @Test
    void requestForUnknownEmailSendsNothing() {
        when(authRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        authService.requestPasswordReset("nobody@example.com");

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void mailedTokenResetsPasswordOnce() {
        Users user = user();
        when(authRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user));

        authService.requestPasswordReset("a@example.com");

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(any(), any(), token.capture());
        // DB에는 원문이 아니라 해시만 저장된다.
        assertThat(user.getPasswordResetTokenHash()).isNotEqualTo(token.getValue()).hasSize(64);

        when(authRepository.findByPasswordResetTokenHash(user.getPasswordResetTokenHash()))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpass1")).thenReturn("encoded");

        authService.resetPassword(token.getValue(), "newpass1");

        assertThat(user.getPassword()).isEqualTo("encoded");
        assertThat(user.getPasswordResetTokenHash()).isNull();
        assertThat(user.isEmailVerified()).isTrue();
        verify(refreshTokenRepository).deleteByUserId(1L);
    }

    @Test
    void expiredTokenIsRejected() {
        Users user = user();
        user.setPasswordResetTokenHash("h");
        user.setPasswordResetExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(authRepository.findByPasswordResetTokenHash(anyString())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.resetPassword("token", "newpass1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(user.getPassword()).isEqualTo("old");
    }

    private Users user() {
        return Users.builder().id(1L).username("alice").email("a@example.com")
                .nickname("alice").password("old").build();
    }
}
