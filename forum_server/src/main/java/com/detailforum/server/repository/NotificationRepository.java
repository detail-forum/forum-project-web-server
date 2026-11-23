package com.detailforum.server.repository;

import com.detailforum.server.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    // 사용자의 알림 목록 조회 (최신순)
    Page<Notification> findByUserIdOrderByCreatedTimeDesc(Long userId, Pageable pageable);
    
    // 사용자의 읽지 않은 알림 개수
    long countByUserIdAndIsReadFalse(Long userId);
    
    // 사용자의 모든 알림을 읽음 처리
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadByUserId(@Param("userId") Long userId);
    
    // 특정 알림을 읽음 처리
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id")
    void markAsRead(@Param("id") Long id);
    
    // 사용자의 읽지 않은 알림 목록
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedTimeDesc(Long userId);
}
