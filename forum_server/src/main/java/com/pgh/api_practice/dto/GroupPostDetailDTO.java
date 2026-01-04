package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupPostDetailDTO {
    private Long id;
    private String title;
    private String body;
    private String username;
    private String nickname;
    private String Views;
    private LocalDateTime createDateTime;
    private LocalDateTime updateDateTime;
    private String profileImageUrl;
    @JsonProperty("isAuthor")
    private boolean isAuthor;
    @JsonProperty("canEdit")
    private boolean canEdit;
    @JsonProperty("canDelete")
    private boolean canDelete;
    @JsonProperty("isPublic")
    private boolean isPublic;  // 모임 외부 노출 여부
    private long likeCount;  // 좋아요 수
    @JsonProperty("isLiked")
    private boolean isLiked;  // 현재 사용자가 좋아요를 눌렀는지 여부
    private List<String> tags;  // 태그 목록
}
