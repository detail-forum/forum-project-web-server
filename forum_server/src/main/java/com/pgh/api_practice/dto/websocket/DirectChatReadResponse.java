package com.pgh.api_practice.dto.websocket;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DirectChatReadResponse {

    private String type;        // READ
    private Long chatRoomId;
    private Long userId;
    private Long messageId;
    private int readCount;
}