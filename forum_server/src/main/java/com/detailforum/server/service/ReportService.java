package com.detailforum.server.service;

import com.detailforum.server.dto.AdminDTO;
import com.detailforum.server.dto.CreateReportDTO;
import com.detailforum.server.entity.Comment;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Report;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.CommentRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.ReportRepository;
import com.detailforum.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 사용자 신고 접수와 관리자 처리. */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final int TITLE_PREVIEW_LENGTH = 80;

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final GroupPostRepository groupPostRepository;
    private final CommentRepository commentRepository;
    private final AdminService adminService;

    /** 신고 대상 요약. 지워진 대상도 관리자 화면에 보여야 하므로 삭제 여부와 함께 돌려준다. */
    private record Target(String title, Users author, boolean deleted, Long postId, Long groupPostId, Long groupId) {
    }

    @Transactional
    public void create(String username, CreateReportDTO dto) {
        Users reporter = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        Target target = load(dto.targetType(), dto.targetId());
        if (target == null || target.deleted()) {
            throw new ResourceNotFoundException("신고할 대상을 찾을 수 없습니다.");
        }
        if (target.author().getId().equals(reporter.getId())) {
            throw new IllegalArgumentException("자신이 쓴 글은 신고할 수 없습니다.");
        }
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporter.getId(), dto.targetType(), dto.targetId())) {
            throw new IllegalArgumentException("이미 신고했습니다.");
        }
        try {
            reportRepository.saveAndFlush(Report.builder()
                    .reporter(reporter)
                    .targetType(dto.targetType())
                    .targetId(dto.targetId())
                    .reason(dto.reason().trim())
                    .build());
        } catch (DataIntegrityViolationException e) {
            // 같은 사람이 동시에 두 번 누른 경우. 유니크 제약이 막는다.
            throw new IllegalArgumentException("이미 신고했습니다.");
        }
    }

    // shortcut: 신고마다 대상을 한 번씩 더 조회한다(한 페이지 20건이면 쿼리 약 40개). 신고가 많아지면 대상 종류별로 묶어 조회한다.
    @Transactional(readOnly = true)
    public Page<AdminDTO.Report> list(Report.Status status, int page, int size) {
        return reportRepository.findByStatus(status, PageWindows.request(page, size)).map(r -> {
            Target t = load(r.getTargetType(), r.getTargetId());
            long openCount = reportRepository.countByTargetTypeAndTargetIdAndStatus(
                    r.getTargetType(), r.getTargetId(), Report.Status.OPEN);
            return new AdminDTO.Report(r.getId(), r.getTargetType(), r.getTargetId(),
                    t == null ? "(찾을 수 없음)" : t.title(),
                    t == null ? null : t.author().getUsername(),
                    t == null || t.deleted(),
                    t == null ? null : t.postId(),
                    t == null ? null : t.groupPostId(),
                    t == null ? null : t.groupId(),
                    r.getReason(), r.getReporter().getUsername(), r.getStatus(), openCount, r.getCreatedTime());
        });
    }

    /** 같은 대상에 쌓인 미처리 신고를 모두 함께 닫는다. 닫은 신고 수를 돌려준다. */
    @Transactional
    public int handle(String adminUsername, Long reportId, AdminDTO.ReportActionRequest.Action action) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("신고를 찾을 수 없습니다."));
        if (report.getStatus() != Report.Status.OPEN) {
            throw new IllegalArgumentException("이미 처리된 신고입니다.");
        }
        Report.Status to = Report.Status.DISMISSED;
        if (action == AdminDTO.ReportActionRequest.Action.DELETE) {
            switch (report.getTargetType()) {
                case POST -> adminService.deletePost(adminUsername, report.getTargetId(), false);
                case GROUP_POST -> adminService.deletePost(adminUsername, report.getTargetId(), true);
                case COMMENT -> adminService.deleteComment(adminUsername, report.getTargetId());
            }
            to = Report.Status.RESOLVED;
        }
        int closed = reportRepository.closeOpen(report.getTargetType(), report.getTargetId(), to);
        log.info("[admin] {} {} {} reports on {} id={}", adminUsername, to == Report.Status.RESOLVED ? "resolved" : "dismissed",
                closed, report.getTargetType(), report.getTargetId());
        return closed;
    }

    private Target load(Report.TargetType type, Long id) {
        return switch (type) {
            case POST -> postRepository.findById(id).map(this::of).orElse(null);
            case GROUP_POST -> groupPostRepository.findById(id).map(this::of).orElse(null);
            case COMMENT -> commentRepository.findById(id).map(this::of).orElse(null);
        };
    }

    private Target of(Post p) {
        return new Target(p.getTitle(), p.getUser(), p.isDeleted(), p.getId(), null,
                p.getGroup() == null ? null : p.getGroup().getId());
    }

    private Target of(GroupPost p) {
        return new Target(p.getTitle(), p.getUser(), p.isDeleted(), null, p.getId(), p.getGroup().getId());
    }

    private Target of(Comment c) {
        String body = c.getBody() == null ? "" : c.getBody();
        String title = body.length() <= TITLE_PREVIEW_LENGTH ? body : body.substring(0, TITLE_PREVIEW_LENGTH) + "…";
        GroupPost gp = c.getGroupPost();
        return new Target(title, c.getUser(), c.isDeleted(),
                c.getPost() == null ? null : c.getPost().getId(),
                gp == null ? null : gp.getId(),
                gp == null ? null : gp.getGroup().getId());
    }
}
