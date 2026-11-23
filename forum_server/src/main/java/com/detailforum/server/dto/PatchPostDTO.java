package com.detailforum.server.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatchPostDTO {
    private String title;
    private String body;
    private String profileImageUrl;  // 게시물 프로필 이미지 URL
    private List<String> tags;  // 태그 목록
    private Boolean isPublic;  // 모임 외부 노출 여부 (모임 게시글인 경우만 사용)
}
