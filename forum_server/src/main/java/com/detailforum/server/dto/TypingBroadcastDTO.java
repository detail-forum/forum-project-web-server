package com.detailforum.server.dto;

import com.detailforum.server.entity.ChatEventType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TypingBroadcastDTO {

    private ChatEventType type;   // TYPING
    private Long chatRoomId;
    private String username;
    private boolean isTyping;
}