package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum GroupPostErrorCode {

    // ==========================
    // Authentication / Authorization
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "GROUPPOST_401",
            "인증이 필요합니다."
    ),

    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "GROUPPOST_403",
            "해당 작업을 수행할 권한이 없습니다."
    ),

    NOT_GROUP_MEMBER(
            HttpStatus.FORBIDDEN,
            "GROUPPOST_403_MEMBER",
            "모임 멤버만 게시물을 작성할 수 있습니다."
    ),

    // ==========================
    // Resource
    // ==========================
    GROUP_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUPPOST_404_GROUP",
            "모임을 찾을 수 없습니다."
    ),

    POST_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "GROUPPOST_404_POST",
            "게시물을 찾을 수 없습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    GroupPostErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}