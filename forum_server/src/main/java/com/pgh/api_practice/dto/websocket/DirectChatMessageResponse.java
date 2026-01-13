package com.pgh.api_practice.dto.websocket;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DirectChatMessageResponse {

    private String type;           // MESSAGE
    private Long id;
    private Long chatRoomId;
    private String message;
    private String username;
    private String nickname;
    private String displayName;
    private String profileImageUrl;
    private LocalDateTime createdTime;
    private String messageType;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
}