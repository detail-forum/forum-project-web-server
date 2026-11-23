package com.detailforum.server.dto.auth;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefreshTokenRequestDTO {
    private String refreshToken;
}
