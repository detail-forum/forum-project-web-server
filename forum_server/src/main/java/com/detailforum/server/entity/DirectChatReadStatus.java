package com.detailforum.server.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(
        name = "direct_chat_read_status",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "unique_user_chat",
                        columnNames = {"chat_room_id", "user_id"}
                )
        }
)
public class DirectChatReadStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // chat_room_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private DirectChatRoom chatRoom;

    // user_id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // last_read_message_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_read_message_id")
    private DirectChatMessage lastReadMessage;

    // last_read_time
    @Column(name = "last_read_time", nullable = false)
    private LocalDateTime lastReadTime;

    public DirectChatReadStatus(DirectChatRoom chatRoom, Long userId) {
        this.chatRoom = chatRoom;
        this.userId = userId;
        this.lastReadTime = LocalDateTime.now();
    }

    public void updateRead(DirectChatMessage message) {
        this.lastReadMessage = message;
        this.lastReadTime = LocalDateTime.now();
    }
}