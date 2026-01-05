package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.CreatePost;
import com.pgh.api_practice.dto.PatchPostDTO;
import com.pgh.api_practice.dto.PostDetailDTO;
import com.pgh.api_practice.dto.PostListDTO;
import com.pgh.api_practice.entity.Group;
import com.pgh.api_practice.entity.GroupPost;
import com.pgh.api_practice.entity.Post;
import com.pgh.api_practice.entity.PostLike;
import com.pgh.api_practice.entity.PostTag;
import com.pgh.api_practice.entity.Tag;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.GroupMemberRepository;
import com.pgh.api_practice.repository.GroupPostRepository;
import com.pgh.api_practice.repository.GroupRepository;
import com.pgh.api_practice.repository.PostLikeRepository;
import com.pgh.api_practice.repository.PostRepository;
import com.pgh.api_practice.repository.PostTagRepository;
import com.pgh.api_practice.repository.TagRepository;
import com.pgh.api_practice.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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

    /** ✅ 게시글 저장 */
    @Transactional
    public long savePost(CreatePost dto) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String username = authentication.getName();

        Users author = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));

        Post.PostBuilder postBuilder = Post.builder()
                .title(dto.getTitle())
                .body(dto.getBody())
                .user(author)
                .profileImageUrl(dto.getProfileImageUrl());

        // 모임 게시글인 경우
        if (dto.getGroupId() != null) {
            Group group = groupRepository.findByIdAndIsDeletedFalse(dto.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
            
            // 모임 멤버인지 확인
            boolean isOwner = group.getOwner().getId().equals(author.getId());
            boolean isMember = isOwner || groupMemberRepository.existsByGroupIdAndUserId(dto.getGroupId(), author.getId());
            
            if (!isMember) {
                throw new ApplicationUnauthorizedException("모임 멤버만 게시글을 작성할 수 있습니다.");
            }
            
            postBuilder.group(group);
            // 모임 게시글의 외부 노출 여부 설정 (기본값: true)
            boolean isPublic = dto.getIsPublic() != null ? dto.getIsPublic() : true;
            postBuilder.isPublic(isPublic);
        }

        Post post = postBuilder.build();

        Post created = postRepository.save(post);
        
        // 태그 저장
        if (dto.getTags() != null && !dto.getTags().isEmpty()) {
            saveTags(created, dto.getTags());
        }
        
        return created.getId();
    }
    
    /** 태그 저장 헬퍼 메서드 */
    private void saveTags(Post post, List<String> tagNames) {
        for (String tagName : tagNames) {
            if (tagName == null || tagName.trim().isEmpty()) {
                continue;
            }
            
            String trimmedTagName = tagName.trim().toLowerCase();
            
            // 태그가 이미 존재하는지 확인
            Tag tag = tagRepository.findByName(trimmedTagName)
                    .orElseGet(() -> {
                        Tag newTag = Tag.builder()
                                .name(trimmedTagName)
                                .build();
                        return tagRepository.save(newTag);
                    });
            
            // PostTag 관계 생성 (중복 체크)
            boolean exists = postTagRepository.findByPostId(post.getId()).stream()
                    .anyMatch(pt -> pt.getTag().getId().equals(tag.getId()));
            
            if (!exists) {
                PostTag postTag = PostTag.builder()
                        .post(post)
                        .tag(tag)
                        .build();
                postTagRepository.save(postTag);
            }
        }
    }

    /** ✅ 단건 조회 (조회수 증가 포함) */
    @Transactional
    public PostDetailDTO getPostDetail(long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));

        if (post.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 게시글입니다.");
        }

        // 조회수 증가 (updatedTime은 변경하지 않음)
        postRepository.incrementViews(id);
        
        // 조회수 증가 후 다시 조회하여 정확한 값 가져오기
        post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));

        // updateDateTime이 null이거나 유효하지 않은 경우 createDateTime으로 설정
        LocalDateTime updateTime = post.getUpdatedTime();
        if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
            updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
            updateTime = post.getCreatedTime();
        }

        // 좋아요 수 조회
        long likeCount = postLikeRepository.countByPostId(post.getId());
        
        // 현재 사용자가 좋아요를 눌렀는지 확인
        boolean isLiked = false;
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName() != null && !"anonymousUser".equals(authentication.getName())) {
            String username = authentication.getName();
            Users user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                isLiked = postLikeRepository.existsByPostIdAndUserId(post.getId(), user.getId());
            }
        }
        
        // 태그 조회
        List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                .map(pt -> pt.getTag().getName())
                .collect(Collectors.toList());

        PostDetailDTO.PostDetailDTOBuilder builder = PostDetailDTO.builder()
                .title(post.getTitle())
                .body(post.getBody())
                .username(post.getUser().getUsername())
                .Views(String.valueOf(post.getViews()))
                .createDateTime(post.getCreatedTime())
                .updateDateTime(updateTime)
                .profileImageUrl(post.getProfileImageUrl())
                .likeCount(likeCount)
                .isLiked(isLiked)
                .tags(tags);
        
        // 모임 정보 추가
        if (post.getGroup() != null) {
            builder.groupId(post.getGroup().getId())
                   .groupName(post.getGroup().getName())
                   .isPublic(post.isPublic());
        }
        
        return builder.build();
    }

    /** ✅ 전체 게시글 목록 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getPostList(Pageable pageable, String sortType, String groupFilter) {
        // groupFilter: ALL(전체), GENERAL(일반 게시글만), GROUP(모임 게시글만)
        boolean filterGeneralOnly = "GENERAL".equalsIgnoreCase(groupFilter);
        boolean filterGroupOnly = "GROUP".equalsIgnoreCase(groupFilter);
        
        // 1. posts 테이블에서 일반 게시글과 외부 공개 모임 게시글 조회 (페이지네이션 없이 전체 조회)
        Page<Post> posts;
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByCreatedTimeDesc(Pageable.unpaged());
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByViewsDesc(Pageable.unpaged());
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByLikesDesc(Pageable.unpaged());
        } else {
            posts = postRepository.findAllPublicPostsOrderByCreatedTimeDesc(Pageable.unpaged());
        }

        // 2. group_posts 테이블에서 외부 공개 게시글 조회 (필터링 필요 시, 페이지네이션 없이 전체 조회)
        Page<GroupPost> publicGroupPosts = null;
        if (!filterGeneralOnly) {
            publicGroupPosts = groupPostRepository.findByIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(Pageable.unpaged());
        }
        
        // 3. 두 결과를 합쳐서 PostListDTO로 변환
        List<PostListDTO> allPosts = new ArrayList<>();
        
        // posts 테이블의 게시글 변환
        posts.getContent().forEach(post -> {
            // 필터링: 일반 게시글만 필터링하는 경우 모임 게시글 제외
            if (filterGeneralOnly && post.getGroup() != null) {
                return; // 모임 게시글은 제외
            }
            // 필터링: 모임 게시글만 필터링하는 경우 일반 게시글 제외
            if (filterGroupOnly && post.getGroup() == null) {
                return; // 일반 게시글은 제외
            }
            
            LocalDateTime updateTime = post.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = post.getCreatedTime();
            }
            
            long likeCount = postLikeRepository.countByPostId(post.getId());
            
            // 태그 조회
            List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                    .map(pt -> pt.getTag().getName())
                    .collect(Collectors.toList());
            
            PostListDTO.PostListDTOBuilder builder = PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(tags);
            
            // 모임 정보 추가
            if (post.getGroup() != null) {
                builder.groupId(post.getGroup().getId())
                       .groupName(post.getGroup().getName())
                       .isPublic(post.isPublic());
            }
            
            allPosts.add(builder.build());
        });
        
        // group_posts 테이블의 외부 공개 게시글 변환 (모임 게시글만 필터링하거나 전체인 경우만)
        if (publicGroupPosts != null && !filterGeneralOnly) {
            publicGroupPosts.getContent().forEach(groupPost -> {
                LocalDateTime updateTime = groupPost.getUpdatedTime();
                if (updateTime == null || updateTime.isBefore(groupPost.getCreatedTime()) || 
                    updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                    updateTime = groupPost.getCreatedTime();
                }
                
                long likeCount = postLikeRepository.countByGroupPostId(groupPost.getId());
                
                PostListDTO dto = PostListDTO.builder()
                        .id(groupPost.getId())
                        .title(groupPost.getTitle())
                        .username(groupPost.getUser().getUsername())
                        .views(groupPost.getViews())
                        .createDateTime(groupPost.getCreatedTime())
                        .updateDateTime(updateTime)
                        .profileImageUrl(groupPost.getProfileImageUrl())
                        .likeCount(likeCount)
                        .tags(new ArrayList<>()) // GroupPost는 태그가 없을 수 있음
                        .groupId(groupPost.getGroup().getId())
                        .groupName(groupPost.getGroup().getName())
                        .isPublic(groupPost.isPublic())
                        .build();
                
                allPosts.add(dto);
            });
        }
        
        // 정렬 (sortType에 따라)
        if ("HITS".equalsIgnoreCase(sortType)) {
            allPosts.sort((a, b) -> Integer.compare(b.getViews(), a.getViews()));
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            allPosts.sort((a, b) -> Long.compare(b.getLikeCount(), a.getLikeCount()));
        } else {
            // RESENT 또는 기본값: 최신순
            allPosts.sort((a, b) -> b.getCreateDateTime().compareTo(a.getCreateDateTime()));
        }
        
        // 페이지네이션 적용
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allPosts.size());
        List<PostListDTO> pagedPosts = allPosts.subList(start, end);
        
        return new PageImpl<>(pagedPosts, pageable, allPosts.size());
    }

    /** ✅ 내 게시글 목록 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getMyPostList(Pageable pageable, String sortType) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String requestUsername = authentication.getName();

        Users user = userRepository.findByUsername(requestUsername)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));

        Page<Post> posts;

        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId(), pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(user.getId(), pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByLikesDesc(user.getId(), pageable);
        } else {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId(), pageable);
        }

        return posts.map(post -> {
            // updateDateTime이 null이거나 유효하지 않은 경우 createDateTime으로 설정
            LocalDateTime updateTime = post.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = post.getCreatedTime();
            }
            
            // 좋아요 수 조회
            long likeCount = postLikeRepository.countByPostId(post.getId());
            
            // 태그 조회
            List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                    .map(pt -> pt.getTag().getName())
                    .collect(Collectors.toList());
            
            return PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(tags)
                    .build();
        });
    }
    
    /** ✅ 태그로 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getPostListByTag(Pageable pageable, String tagName, String sortType, String groupFilter) {
        boolean filterGeneralOnly = "GENERAL".equalsIgnoreCase(groupFilter);
        boolean filterGroupOnly = "GROUP".equalsIgnoreCase(groupFilter);
        
        List<Long> postIds = postTagRepository.findPostIdsByTagName(tagName);
        
        if (postIds.isEmpty()) {
            return new PageImpl<>(new ArrayList<>(), pageable, 0);
        }
        
        Page<Post> posts;
        
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(postIds, pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByViewsDesc(postIds, pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByLikesDesc(postIds, pageable);
        } else {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(postIds, pageable);
        }
        
        List<PostListDTO> filteredPosts = posts.getContent().stream()
                .filter(post -> {
                    // 필터링: 일반 게시글만 필터링하는 경우 모임 게시글 제외
                    if (filterGeneralOnly && post.getGroup() != null) {
                        return false;
                    }
                    // 필터링: 모임 게시글만 필터링하는 경우 일반 게시글 제외
                    if (filterGroupOnly && post.getGroup() == null) {
                        return false;
                    }
                    // 외부 공개 게시글만 포함 (모임 게시글인 경우)
                    if (post.getGroup() != null && !post.isPublic()) {
                        return false;
                    }
                    return true;
                })
                .map(post -> {
                    LocalDateTime updateTime = post.getUpdatedTime();
                    if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                        updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                        updateTime = post.getCreatedTime();
                    }
                    
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    
                    List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                            .map(pt -> pt.getTag().getName())
                            .collect(Collectors.toList());
                    
                    PostListDTO.PostListDTOBuilder builder = PostListDTO.builder()
                            .id(post.getId())
                            .title(post.getTitle())
                            .username(post.getUser().getUsername())
                            .views(post.getViews())
                            .createDateTime(post.getCreatedTime())
                            .updateDateTime(updateTime)
                            .profileImageUrl(post.getProfileImageUrl())
                            .likeCount(likeCount)
                            .tags(tags);
                    
                    if (post.getGroup() != null) {
                        builder.groupId(post.getGroup().getId())
                               .groupName(post.getGroup().getName())
                               .isPublic(post.isPublic());
                    }
                    
                    return builder.build();
                })
                .collect(Collectors.toList());
        
        // 정렬
        if ("HITS".equalsIgnoreCase(sortType)) {
            filteredPosts.sort((a, b) -> Integer.compare(b.getViews(), a.getViews()));
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            filteredPosts.sort((a, b) -> Long.compare(b.getLikeCount(), a.getLikeCount()));
        } else {
            filteredPosts.sort((a, b) -> b.getCreateDateTime().compareTo(a.getCreateDateTime()));
        }
        
        // 페이지네이션 적용
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filteredPosts.size());
        List<PostListDTO> pagedPosts = filteredPosts.subList(start, end);
        
        return new PageImpl<>(pagedPosts, pageable, filteredPosts.size());
    }
    
    /** ✅ 내 게시글 목록 - 태그 필터 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getMyPostListByTag(Pageable pageable, String tagName, String sortType) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String requestUsername = authentication.getName();
        Users user = userRepository.findByUsername(requestUsername)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        List<Long> postIds = postTagRepository.findPostIdsByTagNameAndUserId(tagName, user.getId());
        
        if (postIds.isEmpty()) {
            return new PageImpl<>(new ArrayList<>(), pageable, 0);
        }
        
        Page<Post> posts;
        
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(postIds, pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByViewsDesc(postIds, pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByLikesDesc(postIds, pageable);
        } else {
            posts = postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(postIds, pageable);
        }
        
        return posts.map(post -> {
            LocalDateTime updateTime = post.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = post.getCreatedTime();
            }
            
            long likeCount = postLikeRepository.countByPostId(post.getId());
            
            List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                    .map(pt -> pt.getTag().getName())
                    .collect(Collectors.toList());
            
            return PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(tags)
                    .build();
        });
    }

    /** ✅ 게시글 좋아요 추가/삭제 */
    @Transactional
    public boolean toggleLike(long postId) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String username = authentication.getName();
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        // 먼저 posts 테이블에서 찾기
        Post post = null;
        GroupPost groupPost = null;
        
        Optional<Post> postOpt = postRepository.findById(postId);
        if (postOpt.isPresent()) {
            post = postOpt.get();
            if (post.isDeleted()) {
                throw new ResourceNotFoundException("삭제된 게시글입니다.");
            }
        } else {
            // posts에서 찾지 못하면 group_posts에서 찾기
            Optional<GroupPost> groupPostOpt = groupPostRepository.findByIdAndIsDeletedFalse(postId);
            if (groupPostOpt.isPresent()) {
                groupPost = groupPostOpt.get();
            } else {
                throw new ResourceNotFoundException("게시글을 찾을 수 없습니다.");
            }
        }
        
        Optional<PostLike> existingLike;
        if (post != null) {
            existingLike = postLikeRepository.findByPostIdAndUserId(postId, user.getId());
        } else {
            existingLike = postLikeRepository.findByGroupPostIdAndUserId(postId, user.getId());
        }
        
        if (existingLike.isPresent()) {
            // 좋아요 취소
            postLikeRepository.delete(existingLike.get());
            return false; // 좋아요 취소됨
        } else {
            // 좋아요 추가
            PostLike.PostLikeBuilder likeBuilder = PostLike.builder()
                    .user(user);
            if (post != null) {
                likeBuilder.post(post);
            } else {
                likeBuilder.groupPost(groupPost);
            }
            postLikeRepository.save(likeBuilder.build());
            return true; // 좋아요 추가됨
        }
    }

    /** ✅ 게시글 삭제 */
    public void deletePost(long id) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String requestUserName = authentication.getName();

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));

        if (!post.getUser().getUsername().equals(requestUserName)) {
            throw new ApplicationUnauthorizedException("작성자만 게시글을 삭제할 수 있습니다.");
        }

        post.setDeleted(true);
        postRepository.save(post);
    }

    /** ✅ 게시글 수정 */
    @Transactional
    public void updatePost(long id, PatchPostDTO dto) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String requestUserName = authentication.getName();

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));

        if (post.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 게시글입니다.");
        }

        if (!post.getUser().getUsername().equals(requestUserName)) {
            throw new ApplicationUnauthorizedException("작성자만 게시글을 수정할 수 있습니다.");
        }

        // 내용이 실제로 변경되었는지 확인
        boolean isModified = false;
        if (dto.getBody() != null && !dto.getBody().equals(post.getBody())) {
            post.setBody(dto.getBody());
            isModified = true;
        }
        if (dto.getTitle() != null && !dto.getTitle().equals(post.getTitle())) {
            post.setTitle(dto.getTitle());
            isModified = true;
        }
        if (dto.getProfileImageUrl() != null && !dto.getProfileImageUrl().equals(post.getProfileImageUrl())) {
            post.setProfileImageUrl(dto.getProfileImageUrl());
            isModified = true;
        }

        // 태그 업데이트
        if (dto.getTags() != null) {
            // 기존 태그 삭제
            postTagRepository.deleteByPostId(post.getId());
            // 새 태그 저장
            saveTags(post, dto.getTags());
            isModified = true;
        }
        
        // 모임 게시글의 외부 노출 여부 업데이트
        if (post.getGroup() != null && dto.getIsPublic() != null) {
            post.setPublic(dto.getIsPublic());
            isModified = true;
        }
        
        // 변경사항이 있을 때만 저장
        if (isModified) {
            // 명시적으로 수정 시간 설정 (확실하게 업데이트되도록)
            LocalDateTime now = LocalDateTime.now();
            
            // 1. 엔티티에 직접 설정
            post.setUpdatedTime(now);
            postRepository.save(post);
            
            // 2. @Modifying 쿼리로도 업데이트 (이중 보장)
            postRepository.updateModifiedTime(id, now);
            
            // 플러시하여 DB에 즉시 반영
            postRepository.flush();
        }
    }
    
    /** ✅ 내가 사용한 태그 목록 조회 */
    @Transactional(readOnly = true)
    public List<String> getMyTags() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new ApplicationUnauthorizedException("인증이 필요합니다.");
        }
        
        String requestUsername = authentication.getName();
        Users user = userRepository.findByUsername(requestUsername)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        return postTagRepository.findDistinctTagNamesByUserId(user.getId());
    }
    
    /** ✅ 특정 사용자의 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getUserPostList(String username, Pageable pageable, String sortType) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        Page<Post> posts;
        
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId(), pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(user.getId(), pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByLikesDesc(user.getId(), pageable);
        } else {
            posts = postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId(), pageable);
        }
        
        return posts.map(post -> {
            LocalDateTime updateTime = post.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = post.getCreatedTime();
            }
            
            long likeCount = postLikeRepository.countByPostId(post.getId());
            
            List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                    .map(pt -> pt.getTag().getName())
                    .collect(Collectors.toList());
            
            return PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(tags)
                    .build();
        });
    }
    
    /** ✅ 특정 사용자의 게시글 수 조회 */
    @Transactional(readOnly = true)
    public long getUserPostCount(String username) {
        Users user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
        
        return postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(user.getId(), 
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
    }
    
    /** ✅ 게시글 검색 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> searchPosts(Pageable pageable, String keyword, String sortType, String groupFilter) {
        if (keyword == null || keyword.trim().isEmpty()) {
            // 검색어가 없으면 일반 목록 반환
            return getPostList(pageable, sortType, groupFilter);
        }
        
        boolean filterGeneralOnly = "GENERAL".equalsIgnoreCase(groupFilter);
        boolean filterGroupOnly = "GROUP".equalsIgnoreCase(groupFilter);
        
        String searchKeyword = keyword.trim();
        Page<Post> posts;
        
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.searchPostsByKeyword(searchKeyword, pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.searchPostsByKeywordOrderByViews(searchKeyword, pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.searchPostsByKeywordOrderByLikes(searchKeyword, pageable);
        } else {
            posts = postRepository.searchPostsByKeyword(searchKeyword, pageable);
        }
        
        List<PostListDTO> filteredPosts = posts.getContent().stream()
                .filter(post -> {
                    // 필터링: 일반 게시글만 필터링하는 경우 모임 게시글 제외
                    if (filterGeneralOnly && post.getGroup() != null) {
                        return false;
                    }
                    // 필터링: 모임 게시글만 필터링하는 경우 일반 게시글 제외
                    if (filterGroupOnly && post.getGroup() == null) {
                        return false;
                    }
                    return true;
                })
                .map(post -> {
                    LocalDateTime updateTime = post.getUpdatedTime();
                    if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                        updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                        updateTime = post.getCreatedTime();
                    }
                    
                    long likeCount = postLikeRepository.countByPostId(post.getId());
                    
                    List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                            .map(pt -> pt.getTag().getName())
                            .collect(Collectors.toList());
                    
                    PostListDTO.PostListDTOBuilder builder = PostListDTO.builder()
                            .id(post.getId())
                            .title(post.getTitle())
                            .username(post.getUser().getUsername())
                            .views(post.getViews())
                            .createDateTime(post.getCreatedTime())
                            .updateDateTime(updateTime)
                            .profileImageUrl(post.getProfileImageUrl())
                            .likeCount(likeCount)
                            .tags(tags);
                    
                    // 모임 정보 추가
                    if (post.getGroup() != null) {
                        builder.groupId(post.getGroup().getId())
                               .groupName(post.getGroup().getName())
                               .isPublic(post.isPublic());
                    }
                    
                    return builder.build();
                })
                .collect(Collectors.toList());
        
        // 정렬
        if ("HITS".equalsIgnoreCase(sortType)) {
            filteredPosts.sort((a, b) -> Integer.compare(b.getViews(), a.getViews()));
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            filteredPosts.sort((a, b) -> Long.compare(b.getLikeCount(), a.getLikeCount()));
        } else {
            filteredPosts.sort((a, b) -> b.getCreateDateTime().compareTo(a.getCreateDateTime()));
        }
        
        // 페이지네이션 적용
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filteredPosts.size());
        List<PostListDTO> pagedPosts = filteredPosts.subList(start, end);
        
        return new PageImpl<>(pagedPosts, pageable, filteredPosts.size());
    }
    
    /** ✅ 모임별 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getGroupPostList(Long groupId, Pageable pageable, String sortType, Boolean isPublicFilter) {
        // 모임 존재 확인
        Optional<Group> groupOpt = groupRepository.findByIdAndIsDeletedFalse(groupId);
        if (!groupOpt.isPresent()) {
            throw new ResourceNotFoundException("모임을 찾을 수 없습니다.");
        }
        Group group = groupOpt.get();
        
        // 현재 사용자 확인 (인증되지 않은 경우 null)
        Users currentUser = null;
        boolean isMember = false;
        try {
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getName() != null && !"anonymousUser".equals(authentication.getName())) {
                currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
                if (currentUser != null) {
                    // 모임 주인 확인
                    if (group.getOwner().getId().equals(currentUser.getId())) {
                        isMember = true;
                    } else {
                        // 모임 멤버 확인
                        isMember = groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId()).isPresent();
                    }
                }
            }
        } catch (Exception e) {
            // 인증되지 않은 사용자
        }
        
        // 비멤버인 경우 공개 게시글만 조회
        boolean filterPublicOnly = !isMember;
        if (filterPublicOnly) {
            isPublicFilter = true; // 비멤버는 항상 공개 게시글만
        }
        
        // 1. posts 테이블에서 group_id로 조회 (isPublic 필터링 적용)
        Page<Post> postsFromPostsTable;
        if (isPublicFilter != null) {
            // 공개/비공개 필터링
            if ("RESENT".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdAndIsPublicOrderByCreatedTimeDesc(groupId, isPublicFilter, pageable);
            } else if ("HITS".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdAndIsPublicOrderByViewsDesc(groupId, isPublicFilter, pageable);
            } else if ("LIKES".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdAndIsPublicOrderByLikesDesc(groupId, isPublicFilter, pageable);
            } else {
                postsFromPostsTable = postRepository.findByGroupIdAndIsPublicOrderByCreatedTimeDesc(groupId, isPublicFilter, pageable);
            }
        } else {
            // 필터링 없이 모든 게시글 조회 (멤버만)
            if ("RESENT".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, pageable);
            } else if ("HITS".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdOrderByViewsDesc(groupId, pageable);
            } else if ("LIKES".equalsIgnoreCase(sortType)) {
                postsFromPostsTable = postRepository.findByGroupIdOrderByLikesDesc(groupId, pageable);
            } else {
                postsFromPostsTable = postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, pageable);
            }
        }
        
        // 2. group_posts 테이블에서 조회 (isPublic 필터링 적용)
        Page<GroupPost> groupPosts;
        if (isPublicFilter != null) {
            groupPosts = groupPostRepository.findByGroupIdAndIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(groupId, isPublicFilter, pageable);
        } else {
            groupPosts = groupPostRepository.findByGroupIdAndIsDeletedFalseOrderByCreatedTimeDesc(groupId, pageable);
        }
        
        // 3. 두 결과를 합쳐서 PostListDTO로 변환
        List<PostListDTO> allPosts = new ArrayList<>();
        
        // posts 테이블의 게시글 변환
        postsFromPostsTable.getContent().forEach(post -> {
            LocalDateTime updateTime = post.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(post.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = post.getCreatedTime();
            }
            
            long likeCount = postLikeRepository.countByPostId(post.getId());
            
            // 태그 조회
            List<String> tags = postTagRepository.findByPostId(post.getId()).stream()
                    .map(pt -> pt.getTag().getName())
                    .collect(Collectors.toList());
            
            PostListDTO.PostListDTOBuilder builder = PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(tags);
            
            // 모임 정보 추가
            if (post.getGroup() != null) {
                builder.groupId(post.getGroup().getId())
                       .groupName(post.getGroup().getName())
                       .isPublic(post.isPublic());
            }
            
            allPosts.add(builder.build());
        });
        
        // group_posts 테이블의 게시글 변환
        groupPosts.getContent().forEach(groupPost -> {
            LocalDateTime updateTime = groupPost.getUpdatedTime();
            if (updateTime == null || updateTime.isBefore(groupPost.getCreatedTime()) || 
                updateTime.isBefore(LocalDateTime.of(1970, 1, 2, 0, 0))) {
                updateTime = groupPost.getCreatedTime();
            }
            
            // GroupPost의 좋아요 수 조회
            long likeCount = postLikeRepository.countByGroupPostId(groupPost.getId());
            
            PostListDTO dto = PostListDTO.builder()
                    .id(groupPost.getId())
                    .title(groupPost.getTitle())
                    .username(groupPost.getUser().getUsername())
                    .views(groupPost.getViews())
                    .createDateTime(groupPost.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(groupPost.getProfileImageUrl())
                    .likeCount(likeCount)
                    .tags(new ArrayList<>()) // GroupPost는 태그가 없을 수 있음
                    .groupId(groupPost.getGroup().getId())
                    .groupName(groupPost.getGroup().getName())
                    .isPublic(groupPost.isPublic())
                    .build();
            
            allPosts.add(dto);
        });
        
        // 정렬 (sortType에 따라)
        if ("HITS".equalsIgnoreCase(sortType)) {
            allPosts.sort((a, b) -> Integer.compare(b.getViews(), a.getViews()));
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            allPosts.sort((a, b) -> Long.compare(b.getLikeCount(), a.getLikeCount()));
        } else {
            // RESENT 또는 기본값: 최신순
            allPosts.sort((a, b) -> b.getCreateDateTime().compareTo(a.getCreateDateTime()));
        }
        
        // 페이지네이션 적용
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allPosts.size());
        List<PostListDTO> pagedPosts = allPosts.subList(start, end);
        
        return new PageImpl<>(pagedPosts, pageable, allPosts.size());
    }
}
