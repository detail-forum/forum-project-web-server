package com.detailforum.server.exception;

public class TokenNotValidateException extends RuntimeException {
    public TokenNotValidateException(String message) {
        super(message);
    }
}
