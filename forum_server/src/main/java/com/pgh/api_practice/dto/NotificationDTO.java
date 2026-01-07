package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pgh.api_practice.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private Notification.NotificationType type;
    private String title;
    private String message;
    private Long relatedUserId;
    private String relatedUserNickname;
    private String relatedUserProfileImageUrl;
    private Long relatedPostId;
    private Long relatedGroupPostId;
    private Long relatedGroupId;  // 그룹 게시글의 그룹 ID
    private Long relatedCommentId;
    
    @JsonProperty("isRead")
    private boolean isRead;  // Jackson이 isRead를 read로 직렬화하는 것을 방지
    
    private LocalDateTime createdTime;
}
