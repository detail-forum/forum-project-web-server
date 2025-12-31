package com.pgh.api_practice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupChatRoomDTO {
    private Long id;
    private String name;
    private String description;
    private String profileImageUrl;
    private boolean isAdminRoom;
    private LocalDateTime createdTime;
}
