package com.pgh.api_practice.exception;

import com.pgh.api_practice.errorcode.WebSocketChatErrorCode;
import lombok.Getter;

@Getter
public class WebSocketChatException extends RuntimeException {

    private final WebSocketChatErrorCode errorCode;

    public WebSocketChatException(WebSocketChatErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}