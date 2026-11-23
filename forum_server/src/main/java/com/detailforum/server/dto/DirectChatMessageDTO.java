package com.detailforum.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.detailforum.server.entity.DirectChatMessage;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DirectChatMessageDTO {

    private Long id;

    private Long roomId;

    private Long senderId;
    private String username;
    private String nickname;
    private String profileImageUrl;

    private String message;

    private LocalDateTime createdTime;

    private DirectChatMessage.MessageType messageType;
    private String fileUrl;
    private String fileName;
    private Long fileSize;

    @JsonProperty("isRead")
    private boolean isRead;
}