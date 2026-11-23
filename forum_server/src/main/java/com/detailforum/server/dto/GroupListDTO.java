package com.detailforum.server.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupListDTO {
    private Long id;
    private String name;
    private String description;
    private String ownerUsername;
    private String ownerNickname;
    private String profileImageUrl;
    private long memberCount;
    private LocalDateTime createdTime;
    private boolean isMember;
    private boolean isAdmin;
}
