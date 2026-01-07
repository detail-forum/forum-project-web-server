package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.AuthErrorCode;
import lombok.Getter;

@Getter
public class AuthException extends RuntimeException {

    private final AuthErrorCode errorCode;

    public AuthException(AuthErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}