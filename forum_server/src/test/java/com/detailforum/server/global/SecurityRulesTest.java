package com.detailforum.server.global;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/** 비로그인 요청이 어디까지 닿는지 고정한다. 공개 목록에 없는 경로는 401이어야 한다. */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityRulesTest {

    @Autowired private MockMvc mvc;

    @ParameterizedTest
    @CsvSource({
            "GET, /post/my-post",
            "GET, /post/my-tags",
            "POST, /post",
            "PATCH, /post/1",
            "DELETE, /post/1",
            "POST, /post/1/like",
            "POST, /comment",
            "GET, /notification",
            "GET, /auth/me",
            "PATCH, /auth/profile",
            "GET, /chat/direct/rooms",
            "GET, /group/1/chat-rooms/1/messages",
            "GET, /group/chat/group/rooms",
            "POST, /group",
            "POST, /follow/1",
            "GET, /follow/search",
            "GET, /api/chat/search",
            "POST, /upload/image",
            "POST, /reports",
            "GET, /admin/stats",
            "GET, /some/endpoint/added/later",
    })
    void anonymousIsRejected(String method, String path) throws Exception {
        int status = mvc.perform(request(HttpMethod.valueOf(method), path)).andReturn().getResponse().getStatus();
        assertThat(status).as("%s %s", method, path).isEqualTo(401);
    }

    @ParameterizedTest
    @CsvSource({
            "GET, /post",
            "GET, /post/1",
            "GET, /post/user/someone",
            "GET, /comment",
            "GET, /group",
            "GET, /group/1",
            "GET, /group/1/posts",
            "GET, /group/1/chat-rooms",
            "GET, /follow/user/someone",
            "POST, /auth/login",
    })
    void publicPathsStayOpen(String method, String path) throws Exception {
        int status = mvc.perform(request(HttpMethod.valueOf(method), path)).andReturn().getResponse().getStatus();
        // 데이터가 없어 404나 400이 날 수는 있지만, 보안 필터에서 막히면 안 된다.
        assertThat(status).as("%s %s", method, path).isNotIn(401, 403);
    }
}
