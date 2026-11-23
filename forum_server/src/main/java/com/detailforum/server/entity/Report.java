package com.detailforum.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 사용자가 게시글·모임 게시글·댓글을 신고한 기록.
 * 대상은 세 테이블에 나뉘어 있어 FK 대신 (targetType, targetId)로 가리킨다.
 */
@Entity
@Table(name = "reports",
        uniqueConstraints = @UniqueConstraint(name = "uk_report_reporter_target",
                columnNames = {"reporter_id", "target_type", "target_id"}),
        indexes = @Index(name = "idx_report_status", columnList = "status"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private Users reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(nullable = false, length = 300)
    private String reason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;

    @Column(name = "create_datetime")
    @CreatedDate
    private LocalDateTime createdTime;

    public enum TargetType { POST, GROUP_POST, COMMENT }

    /** RESOLVED: 대상을 삭제함, DISMISSED: 문제없음으로 닫음 */
    public enum Status { OPEN, RESOLVED, DISMISSED }
}
