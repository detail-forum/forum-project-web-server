package com.detailforum.server.dto;

import com.detailforum.server.entity.Users;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** 관리자 화면(/admin) 요청·응답 */
public final class AdminDTO {

    private AdminDTO() {
    }

    public record Stats(long users, long suspendedUsers, long posts, long groupPosts, long comments, long groups,
                        long openReports) {
    }

    /**
     * 신고 한 건과 신고 대상 요약. 화면 이동용으로 postId, groupPostId, groupId 중 필요한 것만 채운다.
     * openCount는 같은 대상에 쌓인 미처리 신고 수다.
     */
    public record Report(Long id, com.detailforum.server.entity.Report.TargetType targetType, Long targetId,
                         String targetTitle, String targetAuthor, boolean targetDeleted,
                         Long postId, Long groupPostId, Long groupId,
                         String reason, String reporter, com.detailforum.server.entity.Report.Status status,
                         long openCount, LocalDateTime createdTime) {
    }

    /** DELETE: 대상을 지우고 신고를 처리 완료로, DISMISS: 대상은 두고 신고만 닫는다. */
    public record ReportActionRequest(@NotNull Action action) {
        public enum Action { DELETE, DISMISS }
    }

    public record User(Long id, String username, String nickname, String email, Users.Role role,
                       boolean suspended, boolean emailVerified, LocalDateTime createdDate) {
    }

    /** groupPost=true면 group_posts 테이블의 글이다. 두 테이블은 id를 따로 매긴다. */
    public record Post(Long id, boolean groupPost, Long groupId, String title, String username,
                       int views, LocalDateTime createdTime) {
    }

    /** postId 또는 groupPostId 중 하나만 있다. */
    public record Comment(Long id, String body, String username, Long postId, Long groupPostId, Long groupId,
                          LocalDateTime createdTime) {
    }

    public record SuspensionRequest(@NotNull Boolean suspended) {
    }

    // 길이는 notifications 테이블 컬럼(title 200, message 500)에 맞춘다.
    public record NoticeRequest(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 500) String message) {
    }
}
