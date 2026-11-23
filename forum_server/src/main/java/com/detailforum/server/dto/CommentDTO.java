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
public class CommentDTO {
    private Long id;
    private String body;
    private String username;
    private Long userId;
    private Long postId;
    private Long parentCommentId; // null이면 최상위 댓글
    private boolean isPinned;
    private long likeCount;
    @JsonProperty("isLiked")
    private boolean isLiked; // 현재 사용자가 좋아요를 눌렀는지 여부
    private LocalDateTime createDateTime;
    private LocalDateTime updateDateTime;
    private List<CommentDTO> replies; // 대댓글 목록
}

