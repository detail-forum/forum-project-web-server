package com.pgh.api_practice.exception;

public class ApplicationBadRequestException extends RuntimeException {
    public ApplicationBadRequestException(String message) {
        super(message);
    }
}
