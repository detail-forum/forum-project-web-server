package com.detailforum.server.service;

import com.detailforum.server.dto.CreatePost;
import com.detailforum.server.dto.PatchPostDTO;
import com.detailforum.server.dto.PostDetailDTO;
import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.PostLike;
import com.detailforum.server.entity.PostTag;
import com.detailforum.server.entity.Tag;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ApplicationUnauthorizedException;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.PostLikeRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.PostTagRepository;
import com.detailforum.server.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** 게시글 쓰기·수정·삭제·좋아요와 상세 조회. 목록은 PostQueryService가 맡는다. */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final TagRepository tagRepository;
    private final PostTagRepository postTagRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupPostRepository groupPostRepository;
    private final NotificationService notificationService;
    private final CurrentUser currentUser;
    private final PostListing listing;

    /** 글 쓰기. groupId가 있으면 그 모임의 멤버만 쓸 수 있다 */
    @Transactional
    public long savePost(CreatePost dto) {
        Users author = currentUser.require();

        Post.PostBuilder postBuilder = Post.builder()
                .title(dto.getTitle())
                .body(dto.getBody())
                .user(author)
                .profileImageUrl(dto.getProfileImageUrl());

        if (dto.getGroupId() != null) {
            Group group = groupRepository.findByIdAndIsDeletedFalse(dto.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
            boolean isMember = group.getOwner().getId().equals(author.getId())
                    || groupMemberRepository.existsByGroupIdAndUserId(dto.getGroupId(), author.getId());
            if (!isMember) {
                throw new ApplicationUnauthorizedException("모임 멤버만 게시글을 작성할 수 있습니다.");
            }
            postBuilder.group(group);
            // 모임 외부 노출 여부 (기본값: 공개)
            postBuilder.isPublic(dto.getIsPublic() != null ? dto.getIsPublic() : true);
        }

        Post created = postRepository.save(postBuilder.build());
        if (dto.getTags() != null && !dto.getTags().isEmpty()) {
            saveTags(created, dto.getTags());
        }
        return created.getId();
    }

    /** 태그 이름은 소문자로 맞추고, 없으면 만든다 */
    private void saveTags(Post post, List<String> tagNames) {
        for (String tagName : tagNames) {
            if (tagName == null || tagName.trim().isEmpty()) {
                continue;
            }
            String name = tagName.trim().toLowerCase();
            Tag tag = tagRepository.findByName(name)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(name).build()));

            boolean exists = postTagRepository.findByPostId(post.getId()).stream()
                    .anyMatch(pt -> pt.getTag().getId().equals(tag.getId()));
            if (!exists) {
                postTagRepository.save(PostTag.builder().post(post).tag(tag).build());
            }
        }
    }

    /** 상세 조회. 조회수를 1 올린다 */
    @Transactional
    public PostDetailDTO getPostDetail(long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        if (post.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 게시글입니다.");
        }

        // 조회수 증가 (updatedTime은 바꾸지 않는다) 후 다시 읽어 정확한 값을 쓴다
        postRepository.incrementViews(id);
        post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        long postId = post.getId();

        boolean isLiked = currentUser.find()
                .map(u -> postLikeRepository.existsByPostIdAndUserId(postId, u.getId()))
                .orElse(false);

        PostDetailDTO.PostDetailDTOBuilder builder = PostDetailDTO.builder()
                .title(post.getTitle())
                .body(post.getBody())
                .username(post.getUser().getUsername())
                .Views(String.valueOf(post.getViews()))
                .createDateTime(post.getCreatedTime())
                .updateDateTime(PostListing.shownUpdatedTime(post.getCreatedTime(), post.getUpdatedTime()))
                .profileImageUrl(post.getProfileImageUrl())
                .likeCount(postLikeRepository.countByPostId(postId))
                .isLiked(isLiked)
                .tags(listing.tagsOf(post));

        if (post.getGroup() != null) {
            builder.groupId(post.getGroup().getId())
                    .groupName(post.getGroup().getName())
                    .isPublic(post.isPublic());
        }
        return builder.build();
    }

    /**
     * 좋아요를 켜고 끈다. 켜졌으면 true.
     * posts와 group_posts는 id를 따로 매기므로 호출한 쪽이 어느 테이블인지 정한다.
     */
    @Transactional
    public boolean toggleLike(long postId, boolean groupPostTarget) {
        Users user = currentUser.require();

        Post post = null;
        GroupPost groupPost = null;
        if (groupPostTarget) {
            groupPost = groupPostRepository.findByIdAndIsDeletedFalse(postId)
                    .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        } else {
            post = postRepository.findById(postId)
                    .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
            if (post.isDeleted()) {
                throw new ResourceNotFoundException("삭제된 게시글입니다.");
            }
        }

        Optional<PostLike> existing = post != null
                ? postLikeRepository.findByPostIdAndUserId(postId, user.getId())
                : postLikeRepository.findByGroupPostIdAndUserId(postId, user.getId());
        if (existing.isPresent()) {
            postLikeRepository.delete(existing.get());
            return false;
        }

        PostLike.PostLikeBuilder like = PostLike.builder().user(user);
        if (post != null) {
            like.post(post);
        } else {
            like.groupPost(groupPost);
        }
        postLikeRepository.save(like.build());

        Long authorId = post != null ? post.getUser().getId() : groupPost.getUser().getId();
        notificationService.createPostLikeNotification(authorId, user.getId(), postId, post == null);
        return true;
    }

    /** 작성자만 지울 수 있다 (소프트 삭제) */
    public void deletePost(long id) {
        String username = currentUser.require().getUsername();
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        if (!post.getUser().getUsername().equals(username)) {
            throw new ApplicationUnauthorizedException("작성자만 게시글을 삭제할 수 있습니다.");
        }
        post.setDeleted(true);
        postRepository.save(post);
    }

    /** 작성자만 고칠 수 있다. 실제로 바뀐 것이 있을 때만 수정 시각을 바꾼다 */
    @Transactional
    public void updatePost(long id, PatchPostDTO dto) {
        String username = currentUser.require().getUsername();
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("게시글을 찾을 수 없습니다."));
        if (post.isDeleted()) {
            throw new ResourceNotFoundException("삭제된 게시글입니다.");
        }
        if (!post.getUser().getUsername().equals(username)) {
            throw new ApplicationUnauthorizedException("작성자만 게시글을 수정할 수 있습니다.");
        }

        boolean modified = false;
        if (dto.getBody() != null && !dto.getBody().equals(post.getBody())) {
            post.setBody(dto.getBody());
            modified = true;
        }
        if (dto.getTitle() != null && !dto.getTitle().equals(post.getTitle())) {
            post.setTitle(dto.getTitle());
            modified = true;
        }
        if (dto.getProfileImageUrl() != null && !dto.getProfileImageUrl().equals(post.getProfileImageUrl())) {
            post.setProfileImageUrl(dto.getProfileImageUrl());
            modified = true;
        }
        if (dto.getTags() != null) {
            postTagRepository.deleteByPostId(post.getId());
            saveTags(post, dto.getTags());
            modified = true;
        }
        if (post.getGroup() != null && dto.getIsPublic() != null) {
            post.setPublic(dto.getIsPublic());
            modified = true;
        }

        if (modified) {
            LocalDateTime now = LocalDateTime.now();
            post.setUpdatedTime(now);
            postRepository.save(post);
            // 감사(auditing) 값이 덮어쓰지 않도록 쿼리로도 한 번 더 쓴다
            postRepository.updateModifiedTime(id, now);
            postRepository.flush();
        }
    }
}
