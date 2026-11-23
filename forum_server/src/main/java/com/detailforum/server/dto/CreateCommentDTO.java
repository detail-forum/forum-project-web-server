package com.detailforum.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreateCommentDTO {
    @NotBlank(message = "댓글 내용을 입력해주세요.")
    private String body;

    @NotNull(message = "게시글 ID가 필요합니다.")
    private Long postId;

    private Long parentCommentId; // null이면 최상위 댓글, 값이 있으면 대댓글
}

