package com.pgh.api_practice.global;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenProviderTest {

    private final TokenProvider provider = new TokenProvider("test-secret-key-must-be-at-least-32-bytes");

    @Test
    void accessAndRefreshTokensStayDistinct() {
        String access = provider.createAccessToken("member");
        String refresh = provider.createRefreshToken("member");

        assertThat(provider.validateToken(access)).isTrue();
        assertThat(provider.validateToken(refresh)).isTrue();
        assertThat(provider.getUsername(access)).isEqualTo("member");
        assertThat(provider.getUsername(refresh)).isEqualTo("member");
        assertThat(provider.getTokenType(access)).isEqualTo("access");
        assertThat(provider.getTokenType(refresh)).isEqualTo("refresh");
        assertThat(provider.isRefreshToken(access)).isFalse();
        assertThat(provider.isRefreshToken(refresh)).isTrue();
        assertThat(access).isNotEqualTo(refresh);
    }
}
