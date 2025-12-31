package com.pgh.api_practice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_chat_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GroupChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Builder.Default
    @Column(name = "is_admin_room", nullable = false)
    private boolean isAdminRoom = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "create_datetime")
    @CreatedDate
    private LocalDateTime createdTime;

    @Column(name = "update_datetime")
    @LastModifiedDate
    private LocalDateTime updatedTime;

    public void setDeleted(boolean deleted) {
        this.isDeleted = deleted;
    }

    public boolean isDeleted() {
        return this.isDeleted;
    }

    public void setAdminRoom(boolean adminRoom) {
        this.isAdminRoom = adminRoom;
    }

    public boolean isAdminRoom() {
        return this.isAdminRoom;
    }
}
