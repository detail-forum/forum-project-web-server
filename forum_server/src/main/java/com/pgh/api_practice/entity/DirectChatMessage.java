package com.pgh.api_practice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "direct_chat_messages")
public class DirectChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // chat_room_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private DirectChatRoom chatRoom;

    // sender_id
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    // message
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    // message_type
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false)
    private MessageType messageType = MessageType.TEXT;

    // file_url
    @Column(name = "file_url", length = 500)
    private String fileUrl;

    // file_name
    @Column(name = "file_name", length = 255)
    private String fileName;

    // file_size
    @Column(name = "file_size")
    private Long fileSize;

    // is_deleted (tinyint(1))
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    // created_time (DB DEFAULT CURRENT_TIMESTAMP)
    @Column(name = "created_time", nullable = false, updatable = false)
    private LocalDateTime createdTime;

    public enum MessageType {
        TEXT, IMAGE, FILE
    }

    public DirectChatMessage(
            DirectChatRoom chatRoom,
            Long senderId,
            String message,
            MessageType messageType,
            String fileUrl,
            String fileName,
            Long fileSize
    ) {
        this.chatRoom = chatRoom;
        this.senderId = senderId;
        this.message = message;
        this.messageType = messageType;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
        this.fileSize = fileSize;
    }

    @PrePersist
    protected void onCreate() {
        this.createdTime = LocalDateTime.now();
    }
}