package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum AuthErrorCode {

    // ==========================
    // Account / User
    // ==========================
    USERNAME_ALREADY_EXISTS(
            HttpStatus.CONFLICT,
            "AUTH_409_USERNAME",
            "이미 사용 중인 아이디입니다."
    ),

    EMAIL_ALREADY_EXISTS(
            HttpStatus.CONFLICT,
            "AUTH_409_EMAIL",
            "이미 사용 중인 이메일입니다."
    ),

    ACCOUNT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "AUTH_404",
            "존재하지 않는 계정입니다."
    ),

    ACCOUNT_DELETED(
            HttpStatus.CONFLICT,
            "AUTH_409",
            "이미 탈퇴한 계정입니다."
    ),

    // ==========================
    // Authentication
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "AUTH_403",
            "인증이 필요합니다."
    ),

    PASSWORD_MISMATCH(
            HttpStatus.BAD_REQUEST,
            "AUTH_400",
            "비밀번호가 일치하지 않습니다."
    ),

    // ==========================
    // Token
    // ==========================
    TOKEN_EXPIRED(
            HttpStatus.UNAUTHORIZED,
            "AUTH_402",
            "토큰이 만료되었습니다."
    ),

    INVALID_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "AUTH_406",
            "유효하지 않은 토큰입니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    AuthErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}