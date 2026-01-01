package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupChatMessageDTO {
    private Long id;
    private String message;
    private String username;
    private String nickname;
    private String profileImageUrl;
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    
    private LocalDateTime createdTime;
    private int readCount;
}
