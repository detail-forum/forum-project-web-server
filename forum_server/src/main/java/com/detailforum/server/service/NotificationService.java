package com.detailforum.server.service;

import com.detailforum.server.dto.NotificationDTO;
import com.detailforum.server.entity.*;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.CommentRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.NotificationRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class NotificationService {

    private final CurrentUser currentUser;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final GroupPostRepository groupPostRepository;
    private final CommentRepository commentRepository;

    /**
     * 현재 인증된 사용자 정보 가져오기
     */
    private Users getCurrentUser() {
        return currentUser.require();
    }

    /**
     * 알림 생성
     */
    @Transactional
    public Notification createNotification(
            Long userId,
            Notification.NotificationType type,
            String title,
            String message,
            Long relatedUserId,
            Long relatedPostId,
            Long relatedGroupPostId,
            Long relatedCommentId) {
        
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));

        Notification.NotificationBuilder builder = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false);

        if (relatedUserId != null) {
            Users relatedUser = userRepository.findById(relatedUserId)
                    .orElse(null);
            if (relatedUser != null) {
                builder.relatedUser(relatedUser);
            }
        }

        if (relatedPostId != null) {
            Post post = postRepository.findById(relatedPostId).orElse(null);
            if (post != null) {
                builder.relatedPost(post);
            }
        }

        if (relatedGroupPostId != null) {
            GroupPost groupPost = groupPostRepository.findById(relatedGroupPostId).orElse(null);
            if (groupPost != null) {
                builder.relatedGroupPost(groupPost);
            }
        }

        if (relatedCommentId != null) {
            Comment comment = commentRepository.findById(relatedCommentId).orElse(null);
            if (comment != null) {
                builder.relatedComment(comment);
            }
        }

        return notificationRepository.save(builder.build());
    }

    /**
     * 게시물 좋아요 알림 생성
     */
    @Transactional
    public void createPostLikeNotification(Long postAuthorId, Long likerId, Long postId, boolean isGroupPost) {
        // 자기 자신에게는 알림을 보내지 않음
        if (postAuthorId.equals(likerId)) {
            return;
        }

        Users liker = userRepository.findById(likerId)
                .orElse(null);
        if (liker == null) {
            return;
        }

        String title = "게시물 좋아요";
        String message = liker.getNickname() + "님이 게시물에 좋아요를 눌렀습니다.";

        if (isGroupPost) {
            createNotification(postAuthorId, Notification.NotificationType.POST_LIKE, title, message,
                    likerId, null, postId, null);
        } else {
            createNotification(postAuthorId, Notification.NotificationType.POST_LIKE, title, message,
                    likerId, postId, null, null);
        }
    }

    /**
     * 댓글 대댓글 알림 생성
     */
    @Transactional
    public void createCommentReplyNotification(Long parentCommentAuthorId, Long replierId, Long postId, Long commentId, boolean isGroupPost) {
        // 자기 자신에게는 알림을 보내지 않음
        if (parentCommentAuthorId.equals(replierId)) {
            return;
        }

        Users replier = userRepository.findById(replierId)
                .orElse(null);
        if (replier == null) {
            return;
        }

        String title = "댓글 알림";
        String message = replier.getNickname() + "님이 댓글에 답글을 남겼습니다.";

        if (isGroupPost) {
            createNotification(parentCommentAuthorId, Notification.NotificationType.COMMENT_REPLY, title, message,
                    replierId, null, postId, commentId);
        } else {
            createNotification(parentCommentAuthorId, Notification.NotificationType.COMMENT_REPLY, title, message,
                    replierId, postId, null, commentId);
        }
    }

    /**
     * 팔로워 증가 알림 생성
     */
    @Transactional
    public void createNewFollowerNotification(Long followingId, Long followerId) {
        Users follower = userRepository.findById(followerId)
                .orElse(null);
        if (follower == null) {
            return;
        }

        String title = "새로운 팔로워";
        String message = follower.getNickname() + "님이 팔로우하기 시작했습니다.";

        createNotification(followingId, Notification.NotificationType.NEW_FOLLOWER, title, message,
                followerId, null, null, null);
    }

    /**
     * 관리자 공지 알림 생성
     */
    @Transactional
    public void createAdminNoticeNotification(Long userId, String title, String message) {
        createNotification(userId, Notification.NotificationType.ADMIN_NOTICE, title, message,
                null, null, null, null);
    }

    /**
     * 메시지 알림 생성 (채팅 메시지)
     */
    @Transactional
    public void createNewMessageNotification(Long receiverId, Long senderId, String senderNickname) {
        String title = "새로운 메시지";
        String message = senderNickname + "님이 메시지를 보냈습니다.";

        createNotification(receiverId, Notification.NotificationType.NEW_MESSAGE, title, message,
                senderId, null, null, null);
    }

    /**
     * 사용자의 알림 목록 조회
     */
    @Transactional(readOnly = true)
    public Page<NotificationDTO> getNotifications(Pageable pageable) {
        Users currentUser = getCurrentUser();
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedTimeDesc(
                currentUser.getId(), pageable);
        
        return notifications.map(this::convertToDTO);
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    @Transactional(readOnly = true)
    public long getUnreadCount() {
        Users currentUser = getCurrentUser();
        return notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId());
    }

    /**
     * 모든 알림을 읽음 처리
     */
    @Transactional
    public void markAllAsRead() {
        Users currentUser = getCurrentUser();
        notificationRepository.markAllAsReadByUserId(currentUser.getId());
    }

    /**
     * 특정 알림을 읽음 처리
     */
    @Transactional
    public NotificationDTO markAsRead(Long notificationId) {
        Users currentUser = getCurrentUser();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("알림을 찾을 수 없습니다."));
        
        // 본인의 알림만 읽음 처리 가능
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new ApplicationUnauthorizedException("본인의 알림만 읽음 처리할 수 있습니다.");
        }
        
        notificationRepository.markAsRead(notificationId);
        
        // 업데이트된 알림을 다시 조회하여 DTO로 변환하여 반환
        Notification updatedNotification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("알림을 찾을 수 없습니다."));
        return convertToDTO(updatedNotification);
    }

    /**
     * 특정 알림의 읽음 상태 확인
     */
    @Transactional(readOnly = true)
    public boolean getReadStatus(Long notificationId) {
        Users currentUser = getCurrentUser();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("알림을 찾을 수 없습니다."));
        
        // 본인의 알림만 확인 가능
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new ApplicationUnauthorizedException("본인의 알림만 확인할 수 있습니다.");
        }
        
        return notification.isRead();
    }

    /**
     * Notification 엔티티를 NotificationDTO로 변환
     */
    private NotificationDTO convertToDTO(Notification notification) {
        NotificationDTO.NotificationDTOBuilder builder = NotificationDTO.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .isRead(notification.isRead())
                .createdTime(notification.getCreatedTime());

        if (notification.getRelatedUser() != null) {
            builder.relatedUserId(notification.getRelatedUser().getId())
                    .relatedUserNickname(notification.getRelatedUser().getNickname())
                    .relatedUserProfileImageUrl(notification.getRelatedUser().getProfileImageUrl());
        }

        if (notification.getRelatedPost() != null) {
            builder.relatedPostId(notification.getRelatedPost().getId());
        }

        if (notification.getRelatedGroupPost() != null) {
            builder.relatedGroupPostId(notification.getRelatedGroupPost().getId());
            // 그룹 ID 추가
            if (notification.getRelatedGroupPost().getGroup() != null) {
                builder.relatedGroupId(notification.getRelatedGroupPost().getGroup().getId());
            }
        }

        if (notification.getRelatedComment() != null) {
            builder.relatedCommentId(notification.getRelatedComment().getId());
        }

        return builder.build();
    }
}
