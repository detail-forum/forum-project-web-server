package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupMemberDTO {
    private Long userId;
    private String username;
    private String nickname;
    private String profileImageUrl;
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    
    @JsonProperty("isOwner")
    private boolean isOwner;
}
