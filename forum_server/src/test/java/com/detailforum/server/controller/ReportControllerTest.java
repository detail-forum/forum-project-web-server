package com.detailforum.server.controller;

import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Report;
import com.detailforum.server.entity.Users;
import com.detailforum.server.global.TokenProvider;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.ReportRepository;
import com.detailforum.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReportControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private TokenProvider tokenProvider;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private ReportRepository reportRepository;

    private Users admin;
    private Users author;
    private Users alice;
    private Users bob;
    private Post post;

    @BeforeEach
    void setUp() {
        admin = saveUser("boss", Users.Role.ADMIN);
        author = saveUser("author", Users.Role.USER);
        alice = saveUser("alice", Users.Role.USER);
        bob = saveUser("bob", Users.Role.USER);
        post = postRepository.save(Post.builder().title("spam").body("buy now").user(author).build());
    }

    @Test
    void reportNeedsLoginAndIsOncePerUser() throws Exception {
        report(null, post.getId()).andExpect(status().isForbidden());
        report(alice, post.getId()).andExpect(status().isOk());
        report(alice, post.getId()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("이미 신고했습니다."));
        report(author, post.getId()).andExpect(status().isBadRequest());
        report(alice, 999999L).andExpect(status().isNotFound());
        assertThat(reportRepository.count()).isEqualTo(1);
    }

    @Test
    void adminDeleteRemovesPostAndClosesEveryOpenReport() throws Exception {
        report(alice, post.getId()).andExpect(status().isOk());
        report(bob, post.getId()).andExpect(status().isOk());

        mvc.perform(get("/admin/reports").header("Authorization", bearer(alice)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/stats").header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.data.openReports").value(2));
        mvc.perform(get("/admin/reports").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.content[0].targetTitle").value("spam"))
                .andExpect(jsonPath("$.data.content[0].openCount").value(2));

        Long reportId = reportRepository.findAll().get(0).getId();
        mvc.perform(patch("/admin/reports/" + reportId)
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"DELETE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(2));

        assertThat(postRepository.findById(post.getId()).orElseThrow().isDeleted()).isTrue();
        assertThat(reportRepository.findAll()).allMatch(r -> r.getStatus() == Report.Status.RESOLVED);
        // 지워진 글은 더 신고할 수 없다.
        report(saveUser("carol", Users.Role.USER), post.getId()).andExpect(status().isNotFound());
    }

    private ResultActions report(Users user, Long postId) throws Exception {
        var req = post("/reports")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetType\":\"POST\",\"targetId\":" + postId + ",\"reason\":\"광고\"}");
        if (user != null) req.header("Authorization", bearer(user));
        return mvc.perform(req);
    }

    private Users saveUser(String username, Users.Role role) {
        return userRepository.save(Users.builder()
                .username(username)
                .password("x")
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
