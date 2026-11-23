package com.detailforum.server.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateCommentDTO {
    @NotBlank(message = "댓글 내용을 입력해주세요.")
    private String body;
}

