package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.PostErrorCode;
import lombok.Getter;

@Getter
public class PostException extends RuntimeException {

    private final PostErrorCode errorCode;

    public PostException(PostErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}