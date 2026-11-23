package com.detailforum.server.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PostDetailDTO  {
    private String title;
    private String body;
    private String username;
    private String Views;
    private LocalDateTime createDateTime;
    private LocalDateTime updateDateTime;
    private String profileImageUrl;
    private long likeCount;
    @JsonProperty("isLiked")
    private boolean isLiked;
    private List<String> tags;
    private Long groupId;
    private String groupName;
    private Boolean isPublic;  // 모임 외부 노출 여부
}
