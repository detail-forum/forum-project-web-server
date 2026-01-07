package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(
        name = "Comment",
        description = "댓글 조회, 작성, 수정, 삭제 및 좋아요/고정 관리 API"
)
@RestController
@RequestMapping("/comment")
@AllArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @Operation(
            summary = "댓글 목록 조회",
            description = "특정 게시글에 작성된 댓글 목록을 조회합니다."
    )
    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentDTO>>> getComments(
            @Parameter(
                    description = "게시글 ID",
                    required = true,
                    example = "1"
            )
            @RequestParam Long postId
    ) {
        List<CommentDTO> comments = commentService.getCommentsByPostId(postId);
        return ResponseEntity.ok(ApiResponse.ok(comments, "댓글 목록 조회 성공"));
    }

    @Operation(
            summary = "댓글 작성",
            description = "게시글에 새로운 댓글을 작성합니다."
    )
    @PostMapping
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(
            @Valid
            @RequestBody(
                    description = "댓글 생성 요청 정보 (postId, content)",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreateCommentDTO dto
    ) {
        CommentDTO comment = commentService.createComment(dto);
        return ResponseEntity.status(201).body(ApiResponse.ok(comment, "댓글 작성 성공"));
    }

    @Operation(
            summary = "댓글 수정",
            description = "댓글 내용을 수정합니다. 작성자만 수정할 수 있습니다."
    )
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<CommentDTO>> updateComment(
            @Parameter(
                    description = "댓글 ID",
                    required = true,
                    example = "10"
            )
            @PathVariable Long id,

            @Valid
            @RequestBody(
                    description = "수정할 댓글 내용",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            UpdateCommentDTO dto
    ) {
        CommentDTO comment = commentService.updateComment(id, dto);
        return ResponseEntity.ok(ApiResponse.ok(comment, "댓글 수정 성공"));
    }

    @Operation(
            summary = "댓글 삭제",
            description = "댓글을 삭제합니다. 작성자만 삭제할 수 있습니다."
    )
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @Parameter(
                    description = "댓글 ID",
                    required = true,
                    example = "10"
            )
            @PathVariable Long id
    ) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.ok("댓글 삭제 성공"));
    }

    @Operation(
            summary = "댓글 좋아요 / 취소",
            description = "댓글에 좋아요를 누르거나 이미 눌렀다면 취소합니다."
    )
    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<CommentDTO>> toggleLike(
            @Parameter(
                    description = "댓글 ID",
                    required = true,
                    example = "10"
            )
            @PathVariable Long id
    ) {
        CommentDTO comment = commentService.toggleLike(id);
        return ResponseEntity.ok(ApiResponse.ok(comment, "좋아요 처리 성공"));
    }

    @Operation(
            summary = "댓글 고정 / 해제",
            description = "댓글을 게시글 상단에 고정하거나 고정을 해제합니다. 게시글 작성자만 가능합니다."
    )
    @PostMapping("/{id}/pin")
    public ResponseEntity<ApiResponse<CommentDTO>> togglePin(
            @Parameter(
                    description = "댓글 ID",
                    required = true,
                    example = "10"
            )
            @PathVariable Long id
    ) {
        CommentDTO comment = commentService.togglePin(id);
        return ResponseEntity.ok(ApiResponse.ok(comment, "댓글 고정 처리 성공"));
    }
}