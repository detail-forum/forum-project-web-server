package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupDetailDTO {
    private Long id;
    private String name;
    private String description;
    private String ownerUsername;
    private String ownerNickname;
    private String profileImageUrl;
    private long memberCount;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
    
    @JsonProperty("isMember")
    private boolean isMember;
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
}
