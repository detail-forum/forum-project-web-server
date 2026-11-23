package com.detailforum.server.exception;

public class ApplicationUnauthorizedException extends RuntimeException {
    public ApplicationUnauthorizedException(String message) {
        super(message);
    }
}
