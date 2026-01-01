package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.CreatePost;
import com.pgh.api_practice.dto.PatchPostDTO;
import com.pgh.api_practice.dto.PostDetailDTO;
import com.pgh.api_practice.dto.PostListDTO;
import com.pgh.api_practice.entity.Group;
import com.pgh.api_practice.entity.Post;
import com.pgh.api_practice.entity.PostLike;
import com.pgh.api_practice.entity.PostTag;
import com.pgh.api_practice.entity.Tag;
import com.pgh.api_practice.entity.Users;
import com.pgh.api_practice.exception.ApplicationUnauthorizedException;
import com.pgh.api_practice.exception.ResourceNotFoundException;
import com.pgh.api_practice.repository.GroupMemberRepository;
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
    public Page<PostListDTO> getPostList(Pageable pageable, String sortType) {
        Page<Post> posts;

        // 일반 게시글과 모임 외부 노출 게시글만 조회
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByCreatedTimeDesc(pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByViewsDesc(pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findAllPublicPostsOrderByLikesDesc(pageable);
        } else {
            posts = postRepository.findAllPublicPostsOrderByCreatedTimeDesc(pageable);
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
            
            PostListDTO.PostListDTOBuilder builder = PostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .username(post.getUser().getUsername())
                    .views(post.getViews())
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .likeCount(likeCount);
            
            // 모임 정보 추가
            if (post.getGroup() != null) {
                builder.groupId(post.getGroup().getId())
                       .groupName(post.getGroup().getName())
                       .isPublic(post.isPublic());
            }
            
            return builder.build();
        });
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
    public Page<PostListDTO> getPostListByTag(Pageable pageable, String tagName, String sortType) {
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
        
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        
        if (post.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 게시글입니다.");
        }
        
        Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, user.getId());
        
        if (existingLike.isPresent()) {
            // 좋아요 취소
            postLikeRepository.delete(existingLike.get());
            return false; // 좋아요 취소됨
        } else {
            // 좋아요 추가
            PostLike like = PostLike.builder()
                    .post(post)
                    .user(user)
                    .build();
            postLikeRepository.save(like);
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
    public Page<PostListDTO> searchPosts(Pageable pageable, String keyword, String sortType) {
        if (keyword == null || keyword.trim().isEmpty()) {
            // 검색어가 없으면 일반 목록 반환
            return getPostList(pageable, sortType);
        }
        
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
        });
    }
    
    /** ✅ 모임별 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public Page<PostListDTO> getGroupPostList(Long groupId, Pageable pageable, String sortType) {
        // 모임 존재 확인
        if (!groupRepository.findByIdAndIsDeletedFalse(groupId).isPresent()) {
            throw new ResourceNotFoundException("모임을 찾을 수 없습니다.");
        }
        
        Page<Post> posts;
        
        if ("RESENT".equalsIgnoreCase(sortType)) {
            posts = postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, pageable);
        } else if ("HITS".equalsIgnoreCase(sortType)) {
            posts = postRepository.findByGroupIdOrderByViewsDesc(groupId, pageable);
        } else if ("LIKES".equalsIgnoreCase(sortType)) {
            posts = postRepository.findByGroupIdOrderByLikesDesc(groupId, pageable);
        } else {
            posts = postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, pageable);
        }
        
        return posts.map(post -> {
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
            
            return builder.build();
        });
    }
}
