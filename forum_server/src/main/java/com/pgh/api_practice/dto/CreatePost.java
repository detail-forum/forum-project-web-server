package com.pgh.api_practice.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreatePost {

    @Size(min = 10, message = "제목은 10자 이상이어야 합니다.")
    private String title;//10자 이상

    @Size(min = 10, message = "본문은 10자 이상이어야 합니다.")
    private String body;//7자 이상

    private String profileImageUrl;  // 게시물 프로필 이미지 URL

    private List<String> tags;  // 태그 목록
}
