package com.detailforum.server.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupPostListDTO {
    private Long id;
    private String title;
    private String body;
    private String username;
    private String nickname;
    private String Views;
    private LocalDateTime createDateTime;
    private LocalDateTime updateDateTime;
    private String profileImageUrl;
}
