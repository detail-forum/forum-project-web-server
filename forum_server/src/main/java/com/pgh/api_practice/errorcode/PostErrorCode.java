package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum PostErrorCode {

    // ==========================
    // Auth
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "POST_401",
            "인증이 필요합니다."
    ),

    // ==========================
    // Post
    // ==========================
    POST_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "POST_404",
            "게시글을 찾을 수 없습니다."
    ),

    POST_DELETED(
            HttpStatus.NOT_FOUND,
            "POST_404_DELETED",
            "삭제된 게시글입니다."
    ),

    NOT_AUTHOR(
            HttpStatus.FORBIDDEN,
            "POST_403_AUTHOR",
            "작성자만 수행할 수 있습니다."
    ),

    // ==========================
    // Group
    // ==========================
    GROUP_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "POST_404_GROUP",
            "모임을 찾을 수 없습니다."
    ),

    GROUP_MEMBER_ONLY(
            HttpStatus.FORBIDDEN,
            "POST_403_GROUP_MEMBER",
            "모임 멤버만 게시글을 작성할 수 있습니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    PostErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}