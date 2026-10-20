package com.pgh.api_practice.global;

import com.pgh.api_practice.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalApiResponseHandlerTest {

    private final GlobalApiResponseHandler handler = new GlobalApiResponseHandler();

    @Test
    void illegalArgumentIsBadRequestAndKeepsMessage() {
        var response = handler.handleIllegalArgument(new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("현재 비밀번호가 일치하지 않습니다.");
    }

    @Test
    void nullPointerIsServerErrorWithoutInternalDetail() {
        ApiResponse<Void> body = handler.handleNullPointer(new NullPointerException("users.password")).getBody();

        assertThat(handler.handleNullPointer(new NullPointerException("users.password")).getStatusCode())
                .isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(body).isNotNull();
        assertThat(body.getMessage()).isEqualTo("서버 내부 오류가 발생했습니다.");
        assertThat(body.getMessage()).doesNotContain("password");
    }

    @Test
    void unexpectedRuntimeExceptionDoesNotLeakCause() {
        var response = handler.handleRuntimeException(new RuntimeException("SQL syntax error near password"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("서버 내부 오류가 발생했습니다.");
        assertThat(response.getBody().getMessage()).doesNotContain("SQL");
    }
}
