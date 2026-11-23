package com.detailforum.server.service;

import com.detailforum.server.dto.AdminDTO;
import com.detailforum.server.entity.Comment;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Notification;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Report;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.CommentRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.NotificationRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.RefreshTokenRepository;
import com.detailforum.server.repository.ReportRepository;
import com.detailforum.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 서비스 관리 기능. 권한 검사는 SecurityConfig의 /admin/** = ROLE_ADMIN 에서 한다.
 * 관리 작업은 누가 무엇을 했는지 로그에 남긴다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int COMMENT_PREVIEW_LENGTH = 200;

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final GroupPostRepository groupPostRepository;
    private final CommentRepository commentRepository;
    private final GroupRepository groupRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final NotificationRepository notificationRepository;
    private final ReportRepository reportRepository;

    @Transactional(readOnly = true)
    public AdminDTO.Stats stats() {
        return new AdminDTO.Stats(
                userRepository.countByIsDeletedFalse(),
                userRepository.countByIsDeletedFalseAndSuspendedTrue(),
                postRepository.countByIsDeletedFalse(),
                groupPostRepository.countByIsDeletedFalse(),
                commentRepository.countByIsDeletedFalse(),
                groupRepository.countByIsDeletedFalse(),
                reportRepository.countByStatus(Report.Status.OPEN));
    }

    @Transactional(readOnly = true)
    public Page<AdminDTO.User> users(String keyword, int page, int size) {
        return userRepository.searchForAdmin(clean(keyword), PageWindows.request(page, size))
                .map(u -> new AdminDTO.User(u.getId(), u.getUsername(), u.getNickname(), u.getEmail(),
                        u.getRole(), u.isSuspended(), u.isEmailVerified(), u.getCreatedDate()));
    }

    @Transactional
    public void setSuspended(String adminUsername, Long userId, boolean suspended) {
        Users target = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));
        if (target.getUsername().equals(adminUsername)) {
            throw new IllegalArgumentException("자기 자신은 정지할 수 없습니다.");
        }
        if (target.getRole() == Users.Role.ADMIN) {
            throw new IllegalArgumentException("관리자 계정은 정지할 수 없습니다.");
        }
        target.setSuspended(suspended);
        if (suspended) {
            // 재발급을 막는다. 남은 액세스 토큰은 JwtAuthenticationFilter가 거부한다.
            refreshTokenRepository.deleteByUserId(target.getId());
        }
        log.info("[admin] {} {} user id={} ({})", adminUsername, suspended ? "suspended" : "restored",
                target.getId(), target.getUsername());
    }

    @Transactional(readOnly = true)
    public Page<AdminDTO.Post> posts(String keyword, boolean groupPost, int page, int size) {
        var pageable = PageWindows.request(page, size);
        if (groupPost) {
            return groupPostRepository.searchForAdmin(clean(keyword), pageable)
                    .map(p -> new AdminDTO.Post(p.getId(), true, p.getGroup().getId(), p.getTitle(),
                            p.getUser().getUsername(), p.getViews(), p.getCreatedTime()));
        }
        return postRepository.searchForAdmin(clean(keyword), pageable)
                .map(p -> new AdminDTO.Post(p.getId(), false, p.getGroup() == null ? null : p.getGroup().getId(),
                        p.getTitle(), p.getUser().getUsername(), p.getViews(), p.getCreatedTime()));
    }

    /** 작성자 삭제와 같은 소프트 삭제다. 복구가 필요하면 DB에서 is_deleted를 되돌린다. */
    @Transactional
    public void deletePost(String adminUsername, Long id, boolean groupPost) {
        if (groupPost) {
            GroupPost post = groupPostRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
            post.setDeleted(true);
        } else {
            Post post = postRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
            post.setDeleted(true);
        }
        log.info("[admin] {} deleted {} id={}", adminUsername, groupPost ? "group post" : "post", id);
    }

    @Transactional(readOnly = true)
    public Page<AdminDTO.Comment> comments(String keyword, int page, int size) {
        return commentRepository.searchForAdmin(clean(keyword), PageWindows.request(page, size))
                .map(c -> new AdminDTO.Comment(c.getId(), preview(c.getBody()), c.getUser().getUsername(),
                        c.getPost() == null ? null : c.getPost().getId(),
                        c.getGroupPost() == null ? null : c.getGroupPost().getId(),
                        c.getGroupPost() == null ? null : c.getGroupPost().getGroup().getId(),
                        c.getCreatedTime()));
    }

    @Transactional
    public void deleteComment(String adminUsername, Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("댓글을 찾을 수 없습니다."));
        comment.setDeleted(true);
        log.info("[admin] {} deleted comment id={}", adminUsername, id);
    }

    /** 탈퇴하지 않은 모든 사용자에게 ADMIN_NOTICE 알림을 보낸다. 보낸 수를 돌려준다. */
    // shortcut: 사용자마다 알림 행을 하나씩 만든다. 사용자가 수만 명을 넘으면 공지 테이블 하나를 함께 읽는 구조로 바꾼다.
    @Transactional
    public int sendNotice(String adminUsername, String title, String message) {
        List<Long> userIds = userRepository.findActiveUserIds();
        List<Notification> notices = userIds.stream()
                .map(id -> Notification.builder()
                        .user(userRepository.getReferenceById(id))
                        .type(Notification.NotificationType.ADMIN_NOTICE)
                        .title(title.trim())
                        .message(message.trim())
                        .isRead(false)
                        .build())
                .toList();
        notificationRepository.saveAll(notices);
        log.info("[admin] {} sent notice \"{}\" to {} users", adminUsername, title, notices.size());
        return notices.size();
    }

    private static String clean(String keyword) {
        return keyword == null ? "" : keyword.trim();
    }

    private static String preview(String body) {
        if (body == null) return "";
        return body.length() <= COMMENT_PREVIEW_LENGTH ? body : body.substring(0, COMMENT_PREVIEW_LENGTH) + "…";
    }
}
