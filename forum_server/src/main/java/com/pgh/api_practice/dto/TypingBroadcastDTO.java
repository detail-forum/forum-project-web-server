package com.pgh.api_practice.dto;

import com.pgh.api_practice.entity.ChatEventType;
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