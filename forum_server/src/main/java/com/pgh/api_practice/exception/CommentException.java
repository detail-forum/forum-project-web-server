package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.CommentErrorCode;
import lombok.Getter;

@Getter
public class CommentException extends RuntimeException {

    private final CommentErrorCode errorCode;

    public CommentException(CommentErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}