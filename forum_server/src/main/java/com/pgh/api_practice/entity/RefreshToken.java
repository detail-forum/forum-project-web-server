package com.pgh.api_practice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refresh_token", nullable = false, unique = true, length = 512)
    private String refreshToken;

    @Column(name = "expiry_datetime", nullable = false)
    private LocalDateTime expiryDateTime;

    /** 새로 발급되는 토큰만 채운다. 기존 행은 null일 수 있다. */
    @Column(name = "user_id")
    private Long userId;
}
