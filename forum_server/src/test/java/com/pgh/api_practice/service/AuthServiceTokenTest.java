package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.ChangePasswordDTO;
import com.pgh.api_practice.dto.auth.RefreshTokenRequestDTO;
import com.pgh.api_practice.entity.RefreshToken;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.RefreshTokenExpiredException;
import com.pgh.api_practice.global.TokenProvider;
import com.pgh.api_practice.repository.AuthRepository;
import com.pgh.api_practice.repository.RefreshTokenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTokenTest {

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

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authRepository,
                passwordEncoder,
                tokenProvider,
                authenticationManager,
                refreshTokenRepository,
                emailService
        );
    }

    @Test
    void refreshRejectsAccessToken() {
        RefreshToken stored = stored("access-token");
        when(tokenProvider.validateToken("access-token")).thenReturn(true);
        when(refreshTokenRepository.findByRefreshToken("access-token")).thenReturn(Optional.of(stored));
        when(tokenProvider.getUsername("access-token")).thenReturn("member");
        when(tokenProvider.getTokenType("access-token")).thenReturn("access");

        assertThatThrownBy(() -> authService.refreshToken(request("access-token")))
                .isInstanceOf(RefreshTokenExpiredException.class);
        verify(authRepository, never()).findByUsername("member");
    }

    @Test
    void refreshRejectsDeletedOrMissingUser() {
        RefreshToken stored = stored("refresh-token");
        when(tokenProvider.validateToken("refresh-token")).thenReturn(true);
        when(refreshTokenRepository.findByRefreshToken("refresh-token")).thenReturn(Optional.of(stored));
        when(tokenProvider.getUsername("refresh-token")).thenReturn("gone");
        when(tokenProvider.getTokenType("refresh-token")).thenReturn("refresh");
        when(authRepository.findByUsername("gone")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshToken(request("refresh-token")))
                .isInstanceOf(RefreshTokenExpiredException.class);
    }

    @Test
    void logoutRevokesOnlyThePresentedRefreshToken() {
        RefreshToken stored = stored("refresh-token");
        when(refreshTokenRepository.findByRefreshToken("refresh-token")).thenReturn(Optional.of(stored));

        authService.revokeRefreshToken("refresh-token");

        verify(refreshTokenRepository).delete(stored);
    }

    @Test
    void changePasswordRevokesEveryRefreshTokenForTheUser() {
        Users user = Users.builder()
                .id(7L)
                .username("member")
                .password("hash")
                .nickname("member")
                .email("member@example.com")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("member", null, List.of()));
        when(authRepository.findByUsername("member")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current-pass", "hash")).thenReturn(true);
        when(passwordEncoder.encode("new-pass")).thenReturn("new-hash");

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setCurrentPassword("current-pass");
        dto.setNewPassword("new-pass");

        authService.changePassword(dto);

        assertThat(user.getPassword()).isEqualTo("new-hash");
        verify(refreshTokenRepository).deleteByUserId(7L);
    }

    @Test
    void wrongCurrentPasswordLeavesRefreshTokensInPlace() {
        Users user = Users.builder()
                .id(7L)
                .username("member")
                .password("hash")
                .nickname("member")
                .email("member@example.com")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("member", null, List.of()));
        when(authRepository.findByUsername("member")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);

        ChangePasswordDTO dto = new ChangePasswordDTO();
        dto.setCurrentPassword("wrong");
        dto.setNewPassword("new-pass");

        assertThatThrownBy(() -> authService.changePassword(dto))
                .isInstanceOf(IllegalArgumentException.class);
        verify(refreshTokenRepository, never()).deleteByUserId(7L);
    }

    private RefreshToken stored(String token) {
        return RefreshToken.builder()
                .refreshToken(token)
                .expiryDateTime(LocalDateTime.now().plusDays(1))
                .build();
    }

    private RefreshTokenRequestDTO request(String token) {
        RefreshTokenRequestDTO dto = new RefreshTokenRequestDTO();
        dto.setRefreshToken(token);
        return dto;
    }
}
