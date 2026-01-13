package com.pgh.api_practice.dto;

import com.pgh.api_practice.entity.ChatEventType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TypingEventDTO {

    private ChatEventType type;   // TYPING
    private Long chatRoomId;
    private boolean isTyping;
}