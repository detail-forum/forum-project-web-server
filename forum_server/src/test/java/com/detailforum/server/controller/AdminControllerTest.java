package com.detailforum.server.controller;

import com.detailforum.server.entity.RefreshToken;
import com.detailforum.server.entity.Users;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.NotificationRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import com.detailforum.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private TokenProvider tokenProvider;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Users admin;
    private Users member;

    @BeforeEach
    void setUp() {
        admin = saveUser("boss", Users.Role.ADMIN);
        member = saveUser("member", Users.Role.USER);
    }

    @Test
    void onlyAdminsCanOpenAdminApi() throws Exception {
        mvc.perform(get("/admin/stats")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/stats").header("Authorization", bearer(member))).andExpect(status().isForbidden());
        mvc.perform(get("/admin/stats").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.users").value(2));
    }

    @Test
    void suspendedUserLosesAccessAndCannotLogIn() throws Exception {
        String memberToken = bearer(member);
        refreshTokenRepository.save(RefreshToken.builder()
                .refreshToken(tokenProvider.createRefreshToken("member"))
                .expiryDateTime(LocalDateTime.now().plusDays(7))
                .userId(member.getId())
                .build());
        mvc.perform(get("/auth/me").header("Authorization", memberToken)).andExpect(status().isOk());

        mvc.perform(patch("/admin/users/" + member.getId() + "/suspension")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suspended\":true}"))
                .andExpect(status().isOk());

        // 이미 받은 액세스 토큰도 더 이상 인증되지 않고, 재발급 토큰은 지워진다.
        mvc.perform(get("/auth/me").header("Authorization", memberToken))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(200));
        assertThat(refreshTokenRepository.findAll()).noneMatch(t -> member.getId().equals(t.getUserId()));
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"member\",\"password\":\"password1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이용이 정지된 계정입니다. 관리자에게 문의해주세요."));
    }

    @Test
    void adminAccountsCannotBeSuspended() throws Exception {
        Users otherAdmin = saveUser("boss2", Users.Role.ADMIN);
        mvc.perform(patch("/admin/users/" + otherAdmin.getId() + "/suspension")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"suspended\":true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void noticeReachesEveryActiveUser() throws Exception {
        mvc.perform(post("/admin/notices")
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"점검 안내\",\"message\":\"오늘 밤 점검합니다.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));
        assertThat(notificationRepository.countByUserIdAndIsReadFalse(member.getId())).isEqualTo(1);
    }

    private Users saveUser(String username, Users.Role role) {
        return userRepository.save(Users.builder()
                .username(username)
                .password(passwordEncoder.encode("password1"))
                .nickname(username)
                .email(username + "@example.com")
                .emailVerified(true)
                .role(role)
                .build());
    }

    private String bearer(Users user) {
        return "Bearer " + tokenProvider.createAccessToken(user.getUsername());
    }
}
