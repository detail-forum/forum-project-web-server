package com.detailforum.server.controller;

import com.detailforum.server.dto.AdminDTO;
import com.detailforum.server.dto.ApiResponse;
import com.detailforum.server.entity.Report;
import com.detailforum.server.service.AdminService;
import com.detailforum.server.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** 서비스 관리 API. SecurityConfig가 /admin/** 를 ROLE_ADMIN에게만 연다. */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ReportService reportService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDTO.Stats>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.stats(), "조회 성공"));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<AdminDTO.User>>> users(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.users(keyword, page, size), "조회 성공"));
    }

    @PatchMapping("/users/{id}/suspension")
    public ResponseEntity<ApiResponse<Void>> setSuspended(@PathVariable Long id,
                                                          @Valid @RequestBody AdminDTO.SuspensionRequest request,
                                                          Authentication authentication) {
        adminService.setSuspended(authentication.getName(), id, request.suspended());
        return ResponseEntity.ok(ApiResponse.ok(request.suspended() ? "계정을 정지했습니다." : "정지를 해제했습니다."));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<Page<AdminDTO.Post>>> posts(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "false") boolean groupPost,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.posts(keyword, groupPost, page, size), "조회 성공"));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable Long id,
                                                        @RequestParam(defaultValue = "false") boolean groupPost,
                                                        Authentication authentication) {
        adminService.deletePost(authentication.getName(), id, groupPost);
        return ResponseEntity.ok(ApiResponse.ok("게시글을 삭제했습니다."));
    }

    @GetMapping("/comments")
    public ResponseEntity<ApiResponse<Page<AdminDTO.Comment>>> comments(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.comments(keyword, page, size), "조회 성공"));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id, Authentication authentication) {
        adminService.deleteComment(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.ok("댓글을 삭제했습니다."));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Page<AdminDTO.Report>>> reports(
            @RequestParam(defaultValue = "OPEN") Report.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.list(status, page, size), "조회 성공"));
    }

    @PatchMapping("/reports/{id}")
    public ResponseEntity<ApiResponse<Integer>> handleReport(@PathVariable Long id,
                                                             @Valid @RequestBody AdminDTO.ReportActionRequest request,
                                                             Authentication authentication) {
        int closed = reportService.handle(authentication.getName(), id, request.action());
        String done = request.action() == AdminDTO.ReportActionRequest.Action.DELETE ? "대상을 삭제하고" : "문제없음으로";
        return ResponseEntity.ok(ApiResponse.ok(closed, done + " 신고 " + closed + "건을 처리했습니다."));
    }

    @PostMapping("/notices")
    public ResponseEntity<ApiResponse<Integer>> sendNotice(@Valid @RequestBody AdminDTO.NoticeRequest request,
                                                           Authentication authentication) {
        int sent = adminService.sendNotice(authentication.getName(), request.title(), request.message());
        return ResponseEntity.ok(ApiResponse.ok(sent, sent + "명에게 공지를 보냈습니다."));
    }
}
