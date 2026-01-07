package com.pgh.api_practice.errorcode;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum CommentErrorCode {

    // ==========================
    // Authentication / Authorization
    // ==========================
    UNAUTHORIZED(
            HttpStatus.UNAUTHORIZED,
            "COMMENT_401",
            "인증이 필요합니다."
    ),

    FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "COMMENT_403",
            "해당 작업을 수행할 권한이 없습니다."
    ),

    INVALID_REPLY_TARGET(
            HttpStatus.FORBIDDEN,
            "COMMENT_403_REPLY",
            "같은 게시글에만 대댓글을 작성할 수 있습니다."
    ),

    // ==========================
    // Resource Not Found
    // ==========================
    USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "COMMENT_404_USER",
            "유저를 찾을 수 없습니다."
    ),

    POST_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "COMMENT_404_POST",
            "게시글을 찾을 수 없습니다."
    ),

    COMMENT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "COMMENT_404_COMMENT",
            "댓글을 찾을 수 없습니다."
    ),

    PARENT_COMMENT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "COMMENT_404_PARENT",
            "부모 댓글을 찾을 수 없습니다."
    ),

    // ==========================
    // Invalid State
    // ==========================
    POST_DELETED(
            HttpStatus.NOT_FOUND,
            "COMMENT_410_POST",
            "삭제된 게시글입니다."
    ),

    COMMENT_DELETED(
            HttpStatus.NOT_FOUND,
            "COMMENT_410_COMMENT",
            "삭제된 댓글입니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    CommentErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}