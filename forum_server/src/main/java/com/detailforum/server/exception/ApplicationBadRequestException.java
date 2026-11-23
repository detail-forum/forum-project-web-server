package com.detailforum.server.exception;

public class ApplicationBadRequestException extends RuntimeException {
    public ApplicationBadRequestException(String message) {
        super(message);
    }
}
