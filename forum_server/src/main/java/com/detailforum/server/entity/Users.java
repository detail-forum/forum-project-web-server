    package com.detailforum.server.entity;

    import com.fasterxml.jackson.annotation.JsonIgnore;
    import jakarta.persistence.*;
    import lombok.*;
    import org.springframework.data.annotation.CreatedDate;
    import org.springframework.data.jpa.domain.support.AuditingEntityListener;

    import java.time.LocalDateTime;

    @Entity
    @Table(name = "users")
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @EntityListeners(AuditingEntityListener.class)
    public class Users {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(nullable = false, unique = true)
        private String username;

        @JsonIgnore
        @Column(nullable = false)
        private String password;

        @Column(nullable = false, unique = true, length = 15)
        private String nickname;

        @Column(nullable = false, unique = true, length = 200)
        private String email;

        @Builder.Default
        @Column(name = "is_deleted", nullable = false)
        private boolean isDeleted = false;

        @Column(name = "profile_image_url", length = 500)
        private String profileImageUrl;

        @Column(name = "github_link", length = 500)
        private String githubLink;

        @Builder.Default
        @Column(name = "email_verified", nullable = false)
        private boolean emailVerified = false;

        @JsonIgnore
        @Column(name = "email_verification_token", length = 255)
        private String emailVerificationToken;

        // 원문 토큰은 메일로만 나가고, DB에는 SHA-256 해시만 둔다.
        @JsonIgnore
        @Column(name = "password_reset_token_hash", length = 64)
        private String passwordResetTokenHash;

        @JsonIgnore
        @Column(name = "password_reset_expires_at")
        private LocalDateTime passwordResetExpiresAt;

        @CreatedDate
        @Column(name = "created_datetime", nullable = false, updatable = false)
        private LocalDateTime createdDate;

        // 기존 행은 DB 기본값으로 USER가 된다. 첫 관리자는 DB에서 직접 지정한다.
        @Builder.Default
        @Enumerated(EnumType.STRING)
        @Column(nullable = false, columnDefinition = "varchar(20) default 'USER'")
        private Role role = Role.USER;

        // 관리자가 정지한 계정은 로그인과 API 인증이 막힌다.
        @Builder.Default
        @Column(name = "is_suspended", nullable = false)
        private boolean suspended = false;

        public enum Role { USER, ADMIN }
    }