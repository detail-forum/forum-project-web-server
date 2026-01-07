package com.pgh.api_practice.exception;

public class TokenNotValidateException extends RuntimeException {
    public TokenNotValidateException(String message) {
        super(message);
    }
}
