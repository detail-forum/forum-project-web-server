package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.FollowErrorCode;
import lombok.Getter;

@Getter
public class FollowException extends RuntimeException {

    private final FollowErrorCode errorCode;

    public FollowException(FollowErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}