package com.pgh.api_practice.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreateGroupPostDTO {
    @Size(min = 10, message = "제목은 10자 이상이어야 합니다.")
    private String title;
    
    @Size(min = 10, message = "본문은 10자 이상이어야 합니다.")
    private String body;
    
    private String profileImageUrl;
    
    private Boolean isPublic;  // 모임 외부 노출 여부
    
    private List<String> tags;  // 태그 목록
}
