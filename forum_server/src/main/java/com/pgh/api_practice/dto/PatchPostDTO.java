package com.pgh.api_practice.dto;

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
}
