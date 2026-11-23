package com.detailforum.server.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DirectChatRoomDTO {

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    private Long otherUserId;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String otherUsername;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String otherNickname;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String otherProfileImageUrl;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMessage;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime lastMessageTime;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private int unreadCount;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime updatedTime;
}