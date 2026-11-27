package com.detailforum.server.global;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AuthRateLimitFilterTest {

    private final AuthRateLimitFilter filter = new AuthRateLimitFilter();

    @Test
    void blocksLoginAfterTenTriesFromSameIp() throws Exception {
        for (int i = 0; i < 10; i++) {
            assertThat(post("/auth/login", "1.1.1.1").getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse blocked = post("/auth/login", "1.1.1.1");
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getContentAsString()).contains("\"success\":false");

        // 다른 IP와 다른 경로는 따로 센다.
        assertThat(post("/auth/login", "2.2.2.2").getStatus()).isEqualTo(200);
        assertThat(post("/auth/register", "1.1.1.1").getStatus()).isEqualTo(200);
    }

    @Test
    void mailEndpointsAllowFive() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertThat(post("/auth/password-reset/request", "3.3.3.3").getStatus()).isEqualTo(200);
        }
        assertThat(post("/auth/password-reset/request", "3.3.3.3").getStatus()).isEqualTo(429);
    }

    @Test
    void otherRequestsAreNotCounted() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertThat(post("/post", "4.4.4.4").getStatus()).isEqualTo(200);
        }
    }

    private MockHttpServletResponse post(String uri, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", uri);
        req.addHeader("X-Real-IP", ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }
}
