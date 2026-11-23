package com.detailforum.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;  // 일반 게시글 (nullable)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_post_id")
    private GroupPost groupPost;  // 모임 게시글 (nullable)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    // 대댓글을 위한 부모 댓글 ID (null이면 최상위 댓글)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parentComment;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    // 글쓴이가 고정한 댓글인지 여부
    @Builder.Default
    @Column(name = "is_pinned", nullable = false)
    private boolean isPinned = false;

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
}

