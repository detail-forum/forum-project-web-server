package com.pgh.api_practice.dto.websocket;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectChatMessageRequest {

    private String type;           // MESSAGE
    private Long chatRoomId;       // 클라이언트 편의용 (서버에서는 무시)
    private String message;
    private String messageType;    // TEXT, IMAGE, FILE
    private String fileUrl;
    private String fileName;
    private Long fileSize;
}