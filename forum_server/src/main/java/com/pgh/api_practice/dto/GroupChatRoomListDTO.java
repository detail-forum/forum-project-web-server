package com.pgh.api_practice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupChatRoomListDTO {

    private Long groupId;
    private String groupName;

    private Long roomId;
    private String roomName;
    private String roomProfileImageUrl;

    private String lastMessage;
    private LocalDateTime lastMessageTime;

    private int unreadCount; // 현재는 항상 0
}