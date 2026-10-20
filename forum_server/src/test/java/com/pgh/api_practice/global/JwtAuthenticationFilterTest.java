package com.pgh.api_practice.global;

import com.pgh.api_practice.repository.RefreshTokenRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private TokenProvider tokenProvider;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refreshTokenIsNotAcceptedAsAccessToken() throws Exception {
        when(tokenProvider.validateToken("refresh-token")).thenReturn(true);
        when(tokenProvider.isRefreshToken("refresh-token")).thenReturn(true);

        filter().doFilter(requestWithBearer("refresh-token"), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(userDetailsService, never()).loadUserByUsername("member");
    }

    @Test
    void legacyRefreshTokenStoredInDatabaseIsNotAccepted() throws Exception {
        when(tokenProvider.validateToken("legacy-refresh")).thenReturn(true);
        when(tokenProvider.isRefreshToken("legacy-refresh")).thenReturn(false);
        when(tokenProvider.getTokenType("legacy-refresh")).thenReturn(null);
        when(refreshTokenRepository.findByRefreshToken("legacy-refresh")).thenReturn(Optional.of(
                com.pgh.api_practice.entity.RefreshToken.builder()
                        .refreshToken("legacy-refresh")
                        .expiryDateTime(java.time.LocalDateTime.now().plusDays(1))
                        .build()
        ));

        filter().doFilter(requestWithBearer("legacy-refresh"), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void accessTokenStillAuthenticates() throws Exception {
        when(tokenProvider.validateToken("access-token")).thenReturn(true);
        when(tokenProvider.isRefreshToken("access-token")).thenReturn(false);
        when(tokenProvider.getTokenType("access-token")).thenReturn("access");
        when(tokenProvider.getUsername("access-token")).thenReturn("member");
        when(userDetailsService.loadUserByUsername("member")).thenReturn(
                User.withUsername("member").password("encoded").roles("USER").build()
        );

        filter().doFilter(requestWithBearer("access-token"), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("member");
    }

    private JwtAuthenticationFilter filter() {
        return new JwtAuthenticationFilter(tokenProvider, userDetailsService, refreshTokenRepository);
    }

    private MockHttpServletRequest requestWithBearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }
}
