package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.PostService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/post")
@AllArgsConstructor
public class PostController {

    private final PostService postService;

    /** ✅ 내 게시글 목록 조회 */
    // GET http://localhost:8081/post/my-post?sortType=RESENT
    @GetMapping("/my-post")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getMyPostList(
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType
    ) {
        Page<PostListDTO> list = postService.getMyPostList(pageable, sortType);
        return ResponseEntity.ok(ApiResponse.ok(list, "내 게시글 조회 성공"));
    }

    /** ✅ 전체 게시글 목록 조회 */
    // GET http://localhost:8081/post?sortType=HITS
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getPostList(
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType
    ) {
        Page<PostListDTO> list = postService.getPostList(pageable, sortType);
        return ResponseEntity.ok(ApiResponse.ok(list, "전체 게시글 조회 성공"));
    }

    /** ✅ 글 등록 */
    // POST http://localhost:8081/post
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> create(@Valid @RequestBody CreatePost dto) {
        postService.savePost(dto);
        return ResponseEntity.status(201).body(ApiResponse.ok("등록 성공"));
    }

    /** ✅ 단건 조회 */
    // GET http://localhost:8081/post/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailDTO>> getPost(@PathVariable Long id) {
        PostDetailDTO detail = postService.getPostDetail(id);
        return ResponseEntity.ok(ApiResponse.ok(detail, "성공"));
    }

    /** ✅ 삭제 */
    // DELETE http://localhost:8081/post/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable long id) {
        postService.deletePost(id);
        return ResponseEntity.ok(ApiResponse.ok("삭제 성공"));
    }

    /** ✅ 수정 */
    // PATCH http://localhost:8081/post/{id}
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> patchPost(
            @PathVariable long id,
            @RequestBody PatchPostDTO dto
    ) {
        postService.updatePost(id, dto);
        return ResponseEntity.ok(ApiResponse.ok("수정 성공"));
    }
}
