package com.pgh.api_practice.dto;


import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class PostListDTO {
    private long id;
    private String title;
    private String username;
    private int views;
    private LocalDateTime createDateTime;
    private LocalDateTime updateDateTime;
    private String profileImageUrl;
    private long likeCount;
    private List<String> tags;
}
