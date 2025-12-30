package com.pgh.api_practice.dto;


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
    private boolean isLiked;
    private List<String> tags;
}
