package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.PostService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/post")
@AllArgsConstructor
public class PostController {

    private final PostService postService;

    /** ✅ 내 게시글 목록 조회 */
    // GET http://localhost:8081/post/my-post?sortType=RESENT&tag=react
    @GetMapping("/my-post")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getMyPostList(
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType,
            @RequestParam(required = false) String tag
    ) {
        Page<PostListDTO> list;
        if (tag != null && !tag.trim().isEmpty()) {
            list = postService.getMyPostListByTag(pageable, tag.trim().toLowerCase(), sortType);
        } else {
            list = postService.getMyPostList(pageable, sortType);
        }
        return ResponseEntity.ok(ApiResponse.ok(list, "내 게시글 조회 성공"));
    }

    /** ✅ 전체 게시글 목록 조회 */
    // GET http://localhost:8081/post?sortType=HITS&tag=react&search=키워드&groupFilter=ALL
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getPostList(
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String groupFilter
    ) {
        Page<PostListDTO> list;
        
        // 검색어가 있으면 검색 결과 반환
        if (search != null && !search.trim().isEmpty()) {
            list = postService.searchPosts(pageable, search.trim(), sortType, groupFilter);
            return ResponseEntity.ok(ApiResponse.ok(list, "검색 결과 조회 성공"));
        }
        
        // 태그 필터링
        if (tag != null && !tag.trim().isEmpty()) {
            list = postService.getPostListByTag(pageable, tag.trim().toLowerCase(), sortType, groupFilter);
        } else {
            list = postService.getPostList(pageable, sortType, groupFilter);
        }
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

    /** ✅ 게시글 좋아요 토글 */
    // POST http://localhost:8081/post/{id}/like
    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Boolean>> toggleLike(@PathVariable long id) {
        boolean isLiked = postService.toggleLike(id);
        return ResponseEntity.ok(ApiResponse.ok(isLiked, isLiked ? "좋아요 추가" : "좋아요 취소"));
    }
    
    /** ✅ 내가 사용한 태그 목록 조회 */
    // GET http://localhost:8081/post/my-tags
    @GetMapping("/my-tags")
    public ResponseEntity<ApiResponse<List<String>>> getMyTags() {
        List<String> tags = postService.getMyTags();
        return ResponseEntity.ok(ApiResponse.ok(tags, "내 태그 조회 성공"));
    }
    
    /** ✅ 특정 사용자의 게시글 목록 조회 */
    // GET http://localhost:8081/post/user/{username}?sortType=RESENT
    @GetMapping("/user/{username}")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getUserPostList(
            @PathVariable String username,
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType
    ) {
        Page<PostListDTO> list = postService.getUserPostList(username, pageable, sortType);
        return ResponseEntity.ok(ApiResponse.ok(list, "사용자 게시글 조회 성공"));
    }
    
    /** ✅ 특정 사용자의 게시글 수 조회 */
    // GET http://localhost:8081/post/user/{username}/count
    @GetMapping("/user/{username}/count")
    public ResponseEntity<ApiResponse<Long>> getUserPostCount(@PathVariable String username) {
        long count = postService.getUserPostCount(username);
        return ResponseEntity.ok(ApiResponse.ok(count, "게시글 수 조회 성공"));
    }
    
    /** ✅ 모임별 게시글 목록 조회 */
    // GET http://localhost:8081/post/group/{groupId}?sortType=RESENT&isPublic=true
    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getGroupPostList(
            @PathVariable Long groupId,
            Pageable pageable,
            @RequestParam(defaultValue = "RESENT") String sortType,
            @RequestParam(required = false) Boolean isPublic
    ) {
        Page<PostListDTO> list = postService.getGroupPostList(groupId, pageable, sortType, isPublic);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 게시글 조회 성공"));
    }
}
