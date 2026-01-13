package com.pgh.api_practice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pgh.api_practice.entity.MessageType;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GroupChatMessageDTO {
    private Long id;
    private String message;
    private String username;
    private String nickname;
    private String displayName;  // 채팅방별 별명
    private String profileImageUrl;
    
    @JsonProperty("isAdmin")
    private boolean isAdmin;
    
    private LocalDateTime createdTime;
    
    private Long replyToMessageId;  // 답장한 메시지 ID
    private ReplyToMessageInfo replyToMessage;  // 답장한 메시지 정보
    
    private List<ReactionInfo> reactions;  // 반응 정보
    private List<String> myReactions;  // 현재 사용자가 추가한 반응 목록

    private MessageType messageType;

    private String fileUrl;
    private String fileName;
    private Long fileSize;
    
    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ReplyToMessageInfo {
        private Long id;
        private String message;
        private String username;
        private String nickname;
        private String displayName;
        private String profileImageUrl;
    }
    
    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ReactionInfo {
        private String emoji;
        private int count;
    }
}
