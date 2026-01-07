package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.errorcode.PostErrorCode;
import com.pgh.api_practice.exception.PostException;
import com.pgh.api_practice.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final TagRepository tagRepository;
    private final PostTagRepository postTagRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupPostRepository groupPostRepository;
    private final GroupPostTagRepository groupPostTagRepository;

    /* =========================
       공통: 현재 사용자
       ========================= */
    private Users getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    /* =========================
       게시글 생성
       ========================= */
    @Transactional
    public long savePost(CreatePost dto) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        Post.PostBuilder builder = Post.builder()
                .title(dto.getTitle())
                .body(dto.getBody())
                .user(user)
                .profileImageUrl(dto.getProfileImageUrl());

        if (dto.getGroupId() != null) {
            Group group = groupRepository.findByIdAndIsDeletedFalse(dto.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));

            boolean isMember = group.getOwner().getId().equals(user.getId())
                    || groupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId());

            if (!isMember) throw new PostException(PostErrorCode.GROUP_MEMBER_ONLY);

            builder.group(group)
                    .isPublic(dto.getIsPublic() != null ? dto.getIsPublic() : true);
        }

        Post post = postRepository.save(builder.build());

        if (dto.getTags() != null) saveTags(post, dto.getTags());

        return post.getId();
    }

    /* =========================
       게시글 상세
       ========================= */
    @Transactional
    public PostDetailDTO getPostDetail(long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) throw new PostException(PostErrorCode.POST_DELETED);

        postRepository.incrementViews(id);

        Users user = getCurrentUser();
        boolean isLiked = user != null &&
                postLikeRepository.existsByPostIdAndUserId(id, user.getId());

        return PostDetailDTO.builder()
                .title(post.getTitle())
                .body(post.getBody())
                .username(post.getUser().getUsername())
                .Views(String.valueOf(post.getViews()))
                .createDateTime(post.getCreatedTime())
                .updateDateTime(
                        post.getUpdatedTime() != null ? post.getUpdatedTime() : post.getCreatedTime()
                )
                .profileImageUrl(post.getProfileImageUrl())
                .likeCount(postLikeRepository.countByPostId(id))
                .isLiked(isLiked)
                .tags(getTags(id))
                .groupId(post.getGroup() != null ? post.getGroup().getId() : null)
                .groupName(post.getGroup() != null ? post.getGroup().getName() : null)
                .isPublic(post.getGroup() != null && post.isPublic())
                .build();
    }

    /* =========================
       내 게시글
       ========================= */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getMyPostList(Pageable pageable, String sortType) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        return postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(
                user.getId(), pageable
        ).map(this::toListDTO);
    }

    @Transactional(readOnly = true)
    public Page<PostListDTO> getMyPostListByTag(Pageable pageable, String tag, String sortType) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        List<Long> ids = postTagRepository.findPostIdsByTagNameAndUserId(tag, user.getId());
        if (ids.isEmpty()) return Page.empty(pageable);

        return postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(ids, pageable)
                .map(this::toListDTO);
    }

    /* =========================
       전체 / 검색 / 태그
       ========================= */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getPostList(Pageable pageable, String sortType, String groupFilter) {
        return postRepository.findAllPublicPostsOrderByCreatedTimeDesc(pageable)
                .map(this::toListDTO);
    }

    @Transactional(readOnly = true)
    public Page<PostListDTO> getPostListByTag(Pageable pageable, String tag, String sortType, String groupFilter) {
        List<Long> ids = postTagRepository.findPostIdsByTagName(tag);
        if (ids.isEmpty()) return Page.empty(pageable);

        return postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(ids, pageable)
                .map(this::toListDTO);
    }

    @Transactional(readOnly = true)
    public Page<PostListDTO> searchPosts(Pageable pageable, String keyword, String sortType, String groupFilter) {
        return postRepository.searchPostsByKeyword(keyword, pageable)
                .map(this::toListDTO);
    }

    /* =========================
       좋아요
       ========================= */
    @Transactional
    public boolean toggleLike(long postId) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        Optional<PostLike> like =
                postLikeRepository.findByPostIdAndUserId(postId, user.getId());

        if (like.isPresent()) {
            postLikeRepository.delete(like.get());
            return false;
        }

        postLikeRepository.save(PostLike.builder().post(post).user(user).build());
        return true;
    }

    /* =========================
       기타
       ========================= */
    @Transactional(readOnly = true)
    public List<String> getMyTags() {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        return postTagRepository.findDistinctTagNamesByUserId(user.getId());
    }

    @Transactional(readOnly = true)
    public Page<PostListDTO> getUserPostList(String username, Pageable pageable, String sortType) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        return postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(
                user.getId(), pageable
        ).map(this::toListDTO);
    }

    @Transactional(readOnly = true)
    public long getUserPostCount(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        return postRepository
                .findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(
                        user.getId(), Pageable.unpaged()
                )
                .getTotalElements();
    }

    @Transactional(readOnly = true)
    public Page<PostListDTO> getGroupPostList(
            Long groupId,
            Pageable pageable,
            String sortType,
            Boolean isPublic
    ) {
        groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));

        Sort sort;
        if ("VIEW".equalsIgnoreCase(sortType)) {
            sort = Sort.by(Sort.Direction.DESC, "views")
                    .and(Sort.by(Sort.Direction.DESC, "createdTime"));
        } else {
            sort = Sort.by(Sort.Direction.DESC, "createdTime");
        }

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                sort
        );

        Page<Post> page;
        if ("VIEW".equalsIgnoreCase(sortType)) {
            page = postRepository.findByGroupId(groupId, sortedPageable);
        } else {
            page = postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, sortedPageable);
        }

        return page.map(this::toListDTO);
    }

    /* =========================
       내부 헬퍼
       ========================= */

    private List<String> getTags(Long postId) {
        return postTagRepository.findByPostId(postId)
                .stream()
                .map(pt -> pt.getTag().getName())
                .collect(Collectors.toList());
    }

    private PostListDTO toListDTO(Post post) {
        return PostListDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .username(post.getUser().getUsername())
                .views(post.getViews())
                .createDateTime(post.getCreatedTime())
                .updateDateTime(
                        post.getUpdatedTime() != null
                                ? post.getUpdatedTime()
                                : post.getCreatedTime()
                )
                .profileImageUrl(post.getProfileImageUrl())
                .likeCount(postLikeRepository.countByPostId(post.getId()))
                .tags(getTags(post.getId()))
                .groupId(
                        post.getGroup() != null
                                ? post.getGroup().getId()
                                : null
                )
                .groupName(
                        post.getGroup() != null
                                ? post.getGroup().getName()
                                : null
                )
                .isPublic(
                        post.getGroup() != null && post.isPublic()
                )
                .build();
    }

    private void saveTags(Post post, List<String> tags) {
        for (String name : tags) {
            if (name == null || name.isBlank()) continue;

            Tag tag = tagRepository.findByName(name.trim().toLowerCase())
                    .orElseGet(() -> tagRepository.save(
                            Tag.builder().name(name.trim().toLowerCase()).build()
                    ));

            boolean exists = postTagRepository.findByPostId(post.getId())
                    .stream().anyMatch(pt -> pt.getTag().getId().equals(tag.getId()));

            if (!exists) {
                postTagRepository.save(PostTag.builder().post(post).tag(tag).build());
            }
        }
    }

    @Transactional
    public void deletePost(long postId) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            throw new PostException(PostErrorCode.POST_DELETED);
        }

        if (!post.getUser().getId().equals(user.getId())) {
            throw new PostException(PostErrorCode.NOT_AUTHOR);
        }

        post.setDeleted(true); // isDeleted = true 처리
    }

    @Transactional
    public void updatePost(long postId, PatchPostDTO dto) {
        Users user = getCurrentUser();
        if (user == null) throw new PostException(PostErrorCode.UNAUTHORIZED);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (post.isDeleted()) {
            throw new PostException(PostErrorCode.POST_DELETED);
        }

        if (!post.getUser().getId().equals(user.getId())) {
            throw new PostException(PostErrorCode.NOT_AUTHOR);
        }

        if (dto.getTitle() != null) {
            post.setTitle(dto.getTitle());
        }

        if (dto.getBody() != null) {
            post.setBody(dto.getBody());
        }

        post.setUpdatedTime(LocalDateTime.now());
    }
}