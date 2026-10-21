package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.UpdateProfileDTO;
import com.pgh.api_practice.entity.Users;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceProfileTest {

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
    private Users user;

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
        user = Users.builder()
                .id(3L)
                .username("member")
                .password("hash")
                .nickname("nick")
                .email("member@example.com")
                .githubLink("https://github.com/member")
                .profileImageUrl("/uploads/old.jpg")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("member", null, List.of()));
        when(authRepository.findByUsername("member")).thenReturn(Optional.of(user));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void javascriptGithubLinkIsNotSaved() {
        UpdateProfileDTO dto = new UpdateProfileDTO();
        dto.setGithubLink("javascript:alert(1)");

        assertThatThrownBy(() -> authService.updateProfile(dto))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(user.getGithubLink()).isEqualTo("https://github.com/member");
        verify(authRepository, never()).save(user);
    }

    @Test
    void blankGithubLinkClearsTheStoredValue() {
        UpdateProfileDTO dto = new UpdateProfileDTO();
        dto.setGithubLink("  ");

        authService.updateProfile(dto);

        assertThat(user.getGithubLink()).isNull();
        verify(authRepository).save(user);
    }
}
