package com.detailforum.server.dto;

import com.detailforum.server.entity.MessageType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateGroupChatMessageDTO {
    // 이미지·파일 메시지는 본문이 비어 있다. 종류별 필수 값은 GroupService.sendChatMessage가 검사한다.
    private String message;


    private MessageType messageType; // TEXT, IMAGE, FILE

    private String fileUrl;
    private String fileName;
    private Long fileSize;
    
    private Long replyToMessageId;  // 답장한 메시지 ID
}
