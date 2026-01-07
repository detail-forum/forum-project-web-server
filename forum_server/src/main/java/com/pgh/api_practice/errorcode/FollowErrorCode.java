package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum FollowErrorCode {

    // ==========================
    // Authentication
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "FOLLOW_401",
            "인증이 필요합니다."
    ),

    // ==========================
    // User
    // ==========================
    USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "FOLLOW_404_USER",
            "유저를 찾을 수 없습니다."
    ),

    TARGET_USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "FOLLOW_404_TARGET",
            "팔로우할 유저를 찾을 수 없습니다."
    ),

    // ==========================
    // Follow Logic
    // ==========================
    SELF_FOLLOW_NOT_ALLOWED(
            HttpStatus.BAD_REQUEST,
            "FOLLOW_400_SELF",
            "자기 자신을 팔로우할 수 없습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    FollowErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}