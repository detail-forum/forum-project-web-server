package com.detailforum.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Builder.Default
    @Column(name = "is_admin", nullable = false)
    private boolean isAdmin = false;

    @Column(name = "display_name", length = 30)
    private String displayName;  // 채팅방별 별명

    @Column(name = "create_datetime")
    @CreatedDate
    private LocalDateTime createdTime;

    public void setAdmin(boolean admin) {
        this.isAdmin = admin;
    }

    public boolean isAdmin() {
        return this.isAdmin;
    }
}
