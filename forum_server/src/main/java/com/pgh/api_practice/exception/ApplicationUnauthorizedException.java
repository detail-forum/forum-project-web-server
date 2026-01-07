package com.pgh.api_practice.exception;

public class ApplicationUnauthorizedException extends RuntimeException {
    public ApplicationUnauthorizedException(String message) {
        super(message);
    }
}
