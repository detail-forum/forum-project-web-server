package com.detailforum.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;  // 알림 수신자

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private NotificationType type;  // 알림 타입

    @Column(nullable = false, length = 200)
    private String title;  // 알림 제목

    @Column(nullable = false, length = 500)
    private String message;  // 알림 메시지

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_user_id")
    private Users relatedUser;  // 관련 사용자 (좋아요한 사람, 댓글 작성자, 팔로워 등)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_post_id")
    private Post relatedPost;  // 관련 게시글

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_group_post_id")
    private GroupPost relatedGroupPost;  // 관련 모임 게시글

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_comment_id")
    private Comment relatedComment;  // 관련 댓글

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;  // 읽음 여부

    @Column(name = "create_datetime")
    @CreatedDate
    private LocalDateTime createdTime;

    public enum NotificationType {
        ADMIN_NOTICE,      // 관리자 공지
        NEW_FOLLOWER,      // 팔로워 증가
        NEW_MESSAGE,       // 메시지
        POST_LIKE,         // 게시물 좋아요
        COMMENT_REPLY      // 게시물 댓글에 대댓글
    }
}
