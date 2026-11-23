package com.detailforum.server.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class PasswordResetDTO {

    private PasswordResetDTO() {
    }

    public record Request(@NotBlank @Email String email) {
    }

    public record Confirm(
            @NotBlank String token,
            @NotBlank @Size(min = 6, message = "비밀번호는 6자 이상이어야 합니다.") String newPassword
    ) {
    }
}
