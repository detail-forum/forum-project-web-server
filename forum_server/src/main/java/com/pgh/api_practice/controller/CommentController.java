package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.CommentService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/comment")
@AllArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * 게시글의 댓글 목록 조회
     * GET /comment?postId=1
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentDTO>>> getComments(@RequestParam Long postId) {
        List<CommentDTO> comments = commentService.getCommentsByPostId(postId);
        return ResponseEntity.ok(ApiResponse.ok(comments, "댓글 목록 조회 성공"));
    }

    /**
     * 댓글 생성
     * POST /comment
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(@Valid @RequestBody CreateCommentDTO dto) {
        CommentDTO comment = commentService.createComment(dto);
        return ResponseEntity.status(201).body(ApiResponse.ok(comment, "댓글 작성 성공"));
    }

    /**
     * 댓글 수정
     * PATCH /comment/{id}
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentDTO>> updateComment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCommentDTO dto
    ) {
        CommentDTO comment = commentService.updateComment(id, dto);
        return ResponseEntity.ok(ApiResponse.ok(comment, "댓글 수정 성공"));
    }

    /**
     * 댓글 삭제
     * DELETE /comment/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.ok("댓글 삭제 성공"));
    }

    /**
     * 댓글 좋아요/취소
     * POST /comment/{id}/like
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<CommentDTO>> toggleLike(@PathVariable Long id) {
        CommentDTO comment = commentService.toggleLike(id);
        return ResponseEntity.ok(ApiResponse.ok(comment, "좋아요 처리 성공"));
    }

    /**
     * 댓글 고정/고정 해제 (게시글 작성자만 가능)
     * POST /comment/{id}/pin
     */
    @PostMapping("/{id}/pin")
    public ResponseEntity<ApiResponse<CommentDTO>> togglePin(@PathVariable Long id) {
        CommentDTO comment = commentService.togglePin(id);
        return ResponseEntity.ok(ApiResponse.ok(comment, "댓글 고정 처리 성공"));
    }
}

