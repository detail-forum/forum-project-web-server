package com.detailforum.server.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreateDirectMessageDTO {

    private String message;

    private MessageType messageType;

    private String fileUrl;
    private String fileName;
    private Long fileSize;

    public enum MessageType {
        TEXT, IMAGE, FILE
    }
}