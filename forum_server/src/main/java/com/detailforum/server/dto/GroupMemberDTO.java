package com.detailforum.server.dto;

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
    private String displayName;  // 채팅방별 별명
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    
    @JsonProperty("isOwner")
    private boolean isOwner;
}
