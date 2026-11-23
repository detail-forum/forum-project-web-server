package com.detailforum.server.controller;

import com.detailforum.server.dto.ApiResponse;
import com.detailforum.server.dto.NotificationDTO;
import com.detailforum.server.service.NotificationService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notification")
@AllArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 알림 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationDTO>>> getNotifications(Pageable pageable) {
        Page<NotificationDTO> notifications = notificationService.getNotifications(pageable);
        return ResponseEntity.ok(ApiResponse.ok(notifications, "알림 목록 조회 성공"));
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.ok(count, "읽지 않은 알림 개수 조회 성공"));
    }

    /**
     * 모든 알림을 읽음 처리
     */
    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.ok(null, "모든 알림을 읽음 처리했습니다."));
    }

    /**
     * 특정 알림을 읽음 처리
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDTO>> markAsRead(@PathVariable Long id) {
        NotificationDTO notification = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.ok(notification, "알림을 읽음 처리했습니다."));
    }

    /**
     * 특정 알림의 읽음 상태 확인
     */
    @GetMapping("/{id}/read-status")
    public ResponseEntity<ApiResponse<Boolean>> getReadStatus(@PathVariable Long id) {
        boolean isRead = notificationService.getReadStatus(id);
        return ResponseEntity.ok(ApiResponse.ok(isRead, "알림 읽음 상태 조회 성공"));
    }
}
