package com.pgh.api_practice.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CorsOriginsTest {

    @Test
    void defaultsKeepKnownFrontendsAndRejectEveryOrigin() {
        assertThat(CorsOrigins.parse(null)).contains(
                "http://localhost:3000",
                "https://forum.rjsgud.com",
                "https://www.forum.rjsgud.com"
        );
        assertThat(CorsOrigins.parse("  ")).doesNotContain("http://*", "https://*");
        assertThat(CorsOrigins.DEFAULTS).doesNotContain("http://*", "https://*");
    }

    @Test
    void customListIsTrimmed() {
        assertThat(CorsOrigins.parse(" https://forum.rjsgud.com, http://localhost:3000 "))
                .containsExactly("https://forum.rjsgud.com", "http://localhost:3000");
    }
}
