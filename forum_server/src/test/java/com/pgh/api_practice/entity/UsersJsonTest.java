package com.pgh.api_practice.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UsersJsonTest {

    @Test
    void responseOmitsPasswordAndVerificationToken() throws Exception {
        Users user = Users.builder()
                .id(1L)
                .username("member")
                .password("$2a$10$hashed-password")
                .nickname("nick")
                .email("member@example.com")
                .emailVerificationToken("one-time-token")
                .build();

        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(user);

        assertThat(json).contains("member", "nick", "member@example.com");
        assertThat(json).doesNotContain("password", "hashed-password", "emailVerificationToken", "one-time-token");
    }
}
