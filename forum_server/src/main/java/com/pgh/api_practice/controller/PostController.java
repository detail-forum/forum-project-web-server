package com.pgh.api_practice.controller;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(
        name = "Post",
        description = "게시글 조회, 작성, 수정, 삭제 및 좋아요 API"
)
@RestController
@RequestMapping("/post")
@AllArgsConstructor
public class PostController {

    private final PostService postService;

    @Operation(
            summary = "내 게시글 목록 조회",
            description = """
                    내가 작성한 게시글을 페이징 조회합니다.
                    
                    - sortType: 정렬 기준 (RESENT, HITS 등)
                    - tag: 태그 필터 (선택)
                    """
    )
    @GetMapping("/my-post")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getMyPostList(
            Pageable pageable,

            @Parameter(description = "정렬 기준", example = "RESENT")
            @RequestParam(defaultValue = "RESENT") String sortType,

            @Parameter(description = "태그 필터", example = "react")
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

    @Operation(
            summary = "전체 게시글 목록 조회",
            description = """
                    전체 게시글을 페이징 조회합니다.
                    
                    - search: 검색어가 있으면 검색 결과 반환
                    - tag: 태그 필터
                    - groupFilter: 모임 필터 (ALL 등)
                    """
    )
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getPostList(
            Pageable pageable,

            @Parameter(description = "정렬 기준", example = "RESENT")
            @RequestParam(defaultValue = "RESENT") String sortType,

            @Parameter(description = "태그 필터", example = "react")
            @RequestParam(required = false) String tag,

            @Parameter(description = "검색어", example = "키워드")
            @RequestParam(required = false) String search,

            @Parameter(description = "모임 필터", example = "ALL")
            @RequestParam(required = false) String groupFilter
    ) {
        Page<PostListDTO> list;

        if (search != null && !search.trim().isEmpty()) {
            list = postService.searchPosts(pageable, search.trim(), sortType, groupFilter);
            return ResponseEntity.ok(ApiResponse.ok(list, "검색 결과 조회 성공"));
        }

        if (tag != null && !tag.trim().isEmpty()) {
            list = postService.getPostListByTag(pageable, tag.trim().toLowerCase(), sortType, groupFilter);
        } else {
            list = postService.getPostList(pageable, sortType, groupFilter);
        }
        return ResponseEntity.ok(ApiResponse.ok(list, "전체 게시글 조회 성공"));
    }

    @Operation(
            summary = "게시글 작성",
            description = "게시글을 작성합니다."
    )
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> create(
            @Valid
            @RequestBody(
                    description = "게시글 작성 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            CreatePost dto
    ) {
        postService.savePost(dto);
        return ResponseEntity.status(201).body(ApiResponse.ok("등록 성공"));
    }

    @Operation(
            summary = "게시글 단건 조회",
            description = "게시글 상세 정보를 조회합니다."
    )
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailDTO>> getPost(
            @Parameter(description = "게시글 ID", required = true, example = "10")
            @PathVariable Long id
    ) {
        PostDetailDTO detail = postService.getPostDetail(id);
        return ResponseEntity.ok(ApiResponse.ok(detail, "성공"));
    }

    @Operation(
            summary = "게시글 삭제",
            description = "게시글을 삭제합니다. 작성자만 가능합니다."
    )
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @Parameter(description = "게시글 ID", required = true, example = "10")
            @PathVariable long id
    ) {
        postService.deletePost(id);
        return ResponseEntity.ok(ApiResponse.ok("삭제 성공"));
    }

    @Operation(
            summary = "게시글 수정",
            description = "게시글 내용을 수정합니다."
    )
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> patchPost(
            @Parameter(description = "게시글 ID", required = true, example = "10")
            @PathVariable long id,

            @RequestBody(
                    description = "수정할 게시글 정보",
                    required = true
            )
            @org.springframework.web.bind.annotation.RequestBody
            PatchPostDTO dto
    ) {
        postService.updatePost(id, dto);
        return ResponseEntity.ok(ApiResponse.ok("수정 성공"));
    }

    @Operation(
            summary = "게시글 좋아요 토글",
            description = """
                    게시글 좋아요를 추가하거나 취소합니다.
                    
                    - true : 좋아요 추가
                    - false : 좋아요 취소
                    """
    )
    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Boolean>> toggleLike(
            @Parameter(description = "게시글 ID", required = true, example = "10")
            @PathVariable long id
    ) {
        boolean isLiked = postService.toggleLike(id);
        return ResponseEntity.ok(ApiResponse.ok(
                isLiked,
                isLiked ? "좋아요 추가" : "좋아요 취소"
        ));
    }

    @Operation(
            summary = "내가 사용한 태그 목록 조회",
            description = "내가 작성한 게시글에서 사용한 태그 목록을 조회합니다."
    )
    @GetMapping("/my-tags")
    public ResponseEntity<ApiResponse<List<String>>> getMyTags() {
        List<String> tags = postService.getMyTags();
        return ResponseEntity.ok(ApiResponse.ok(tags, "내 태그 조회 성공"));
    }

    @Operation(
            summary = "특정 사용자 게시글 목록 조회",
            description = "username 기준으로 게시글 목록을 페이징 조회합니다."
    )
    @GetMapping("/user/{username}")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getUserPostList(
            @Parameter(description = "사용자 username", required = true, example = "juyoung")
            @PathVariable String username,

            Pageable pageable,

            @Parameter(description = "정렬 기준", example = "RESENT")
            @RequestParam(defaultValue = "RESENT") String sortType
    ) {
        Page<PostListDTO> list = postService.getUserPostList(username, pageable, sortType);
        return ResponseEntity.ok(ApiResponse.ok(list, "사용자 게시글 조회 성공"));
    }

    @Operation(
            summary = "특정 사용자 게시글 수 조회",
            description = "username 기준으로 게시글 총 개수를 조회합니다."
    )
    @GetMapping("/user/{username}/count")
    public ResponseEntity<ApiResponse<Long>> getUserPostCount(
            @Parameter(description = "사용자 username", required = true, example = "juyoung")
            @PathVariable String username
    ) {
        long count = postService.getUserPostCount(username);
        return ResponseEntity.ok(ApiResponse.ok(count, "게시글 수 조회 성공"));
    }

    @Operation(
            summary = "모임별 게시글 목록 조회",
            description = """
                    특정 모임의 게시글을 조회합니다.
                    
                    - isPublic=true : 공개 게시글만
                    - isPublic=false 또는 미지정 : 전체
                    """
    )
    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<Page<PostListDTO>>> getGroupPostList(
            @Parameter(description = "모임 ID", required = true, example = "1")
            @PathVariable Long groupId,

            Pageable pageable,

            @Parameter(description = "정렬 기준", example = "RESENT")
            @RequestParam(defaultValue = "RESENT") String sortType,

            @Parameter(description = "공개 여부 필터", example = "true")
            @RequestParam(required = false) Boolean isPublic
    ) {
        Page<PostListDTO> list =
                postService.getGroupPostList(groupId, pageable, sortType, isPublic);
        return ResponseEntity.ok(ApiResponse.ok(list, "모임 게시글 조회 성공"));
    }
}