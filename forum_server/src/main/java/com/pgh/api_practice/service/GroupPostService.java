package com.pgh.api_practice.service;

import com.pgh.api_practice.dto.*;
import com.pgh.api_practice.entity.*;
import com.pgh.api_practice.errorcode.GroupPostErrorCode;
import com.pgh.api_practice.exception.GroupPostException;
import com.pgh.api_practice.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class GroupPostService {

    private final GroupPostRepository groupPostRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final TagRepository tagRepository;
    private final GroupPostTagRepository groupPostTagRepository;

    /** 현재 사용자 가져오기 */
    private Users getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    /** 모임 활동 게시물 생성 */
    @Transactional
    public Long createGroupPost(Long groupId, CreateGroupPostDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new GroupPostException(GroupPostErrorCode.UNAUTHORIZED);
        }

        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.GROUP_NOT_FOUND));

        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUser.getId())) {
            throw new GroupPostException(GroupPostErrorCode.NOT_GROUP_MEMBER);
        }

        GroupPost post = GroupPost.builder()
                .group(group)
                .title(dto.getTitle())
                .body(dto.getBody())
                .user(currentUser)
                .profileImageUrl(dto.getProfileImageUrl())
                .isPublic(dto.getIsPublic() != null ? dto.getIsPublic() : true)
                .build();

        GroupPost created = groupPostRepository.save(post);

        if (dto.getTags() != null && !dto.getTags().isEmpty()) {
            saveTags(created, dto.getTags());
        }

        return created.getId();
    }

    /** 태그 저장 */
    private void saveTags(GroupPost post, List<String> tagNames) {
        for (String tagName : tagNames) {
            if (tagName == null || tagName.trim().isEmpty()) continue;

            String normalized = tagName.trim().toLowerCase();

            Tag tag = tagRepository.findByName(normalized)
                    .orElseGet(() -> tagRepository.save(
                            Tag.builder().name(normalized).build()
                    ));

            boolean exists = groupPostTagRepository.findByGroupPostId(post.getId())
                    .stream()
                    .anyMatch(gpt -> gpt.getTag().getId().equals(tag.getId()));

            if (!exists) {
                groupPostTagRepository.save(
                        GroupPostTag.builder()
                                .groupPost(post)
                                .tag(tag)
                                .build()
                );
            }
        }
    }

    /** 모임 활동 게시물 목록 조회 */
    @Transactional(readOnly = true)
    public Page<GroupPostListDTO> getGroupPostList(Long groupId, Pageable pageable) {
        groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.GROUP_NOT_FOUND));

        Page<GroupPost> posts =
                groupPostRepository.findByGroupIdAndIsDeletedFalseOrderByCreatedTimeDesc(
                        groupId, pageable
                );

        List<GroupPostListDTO> list = posts.getContent().stream().map(post -> {
            LocalDateTime updateTime =
                    post.getUpdatedTime() == null ||
                            post.getUpdatedTime().isBefore(post.getCreatedTime())
                            ? post.getCreatedTime()
                            : post.getUpdatedTime();

            return GroupPostListDTO.builder()
                    .id(post.getId())
                    .title(post.getTitle())
                    .body(post.getBody())
                    .username(post.getUser().getUsername())
                    .nickname(post.getUser().getNickname())
                    .Views(String.valueOf(post.getViews()))
                    .createDateTime(post.getCreatedTime())
                    .updateDateTime(updateTime)
                    .profileImageUrl(post.getProfileImageUrl())
                    .build();
        }).collect(Collectors.toList());

        return new PageImpl<>(list, pageable, posts.getTotalElements());
    }

    /** 모임 활동 게시물 상세 조회 */
    @Transactional
    public GroupPostDetailDTO getGroupPostDetail(Long groupId, Long postId) {
        groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.GROUP_NOT_FOUND));

        GroupPost post = groupPostRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.POST_NOT_FOUND));

        groupPostRepository.incrementViews(postId);
        post = groupPostRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.POST_NOT_FOUND));

        Users currentUser = getCurrentUser();

        boolean isAuthor = currentUser != null &&
                post.getUser().getId().equals(currentUser.getId());

        boolean canEdit = isAuthor;
        boolean canDelete = false;

        if (currentUser != null) {
            Optional<GroupMember> member =
                    groupMemberRepository.findByGroupIdAndUserId(groupId, currentUser.getId());
            boolean isAdmin = member.isPresent() && member.get().isAdmin();
            canDelete = isAuthor || isAdmin;
        }

        LocalDateTime updateTime =
                post.getUpdatedTime() == null ||
                        post.getUpdatedTime().isBefore(post.getCreatedTime())
                        ? post.getCreatedTime()
                        : post.getUpdatedTime();

        long likeCount = postLikeRepository.countByGroupPostId(post.getId());
        boolean isLiked = currentUser != null &&
                postLikeRepository.existsByGroupPostIdAndUserId(post.getId(), currentUser.getId());

        List<String> tags = groupPostTagRepository.findByGroupPostId(post.getId())
                .stream()
                .map(gpt -> gpt.getTag().getName())
                .collect(Collectors.toList());

        return GroupPostDetailDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .body(post.getBody())
                .username(post.getUser().getUsername())
                .nickname(post.getUser().getNickname())
                .Views(String.valueOf(post.getViews()))
                .createDateTime(post.getCreatedTime())
                .updateDateTime(updateTime)
                .profileImageUrl(post.getProfileImageUrl())
                .isAuthor(isAuthor)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .isPublic(post.isPublic())
                .likeCount(likeCount)
                .isLiked(isLiked)
                .tags(tags)
                .build();
    }

    /** 모임 활동 게시물 수정 */
    @Transactional
    public void updateGroupPost(Long groupId, Long postId, CreateGroupPostDTO dto) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new GroupPostException(GroupPostErrorCode.UNAUTHORIZED);
        }

        groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.GROUP_NOT_FOUND));

        GroupPost post = groupPostRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.POST_NOT_FOUND));

        if (!post.getUser().getId().equals(currentUser.getId())) {
            throw new GroupPostException(GroupPostErrorCode.FORBIDDEN);
        }

        post.setTitle(dto.getTitle());
        post.setBody(dto.getBody());
        if (dto.getProfileImageUrl() != null) post.setProfileImageUrl(dto.getProfileImageUrl());
        if (dto.getIsPublic() != null) post.setPublic(dto.getIsPublic());

        groupPostRepository.save(post);

        if (dto.getTags() != null) {
            groupPostTagRepository.deleteByGroupPostId(post.getId());
            if (!dto.getTags().isEmpty()) {
                saveTags(post, dto.getTags());
            }
        }
    }

    /** 모임 활동 게시물 삭제 */
    @Transactional
    public void deleteGroupPost(Long groupId, Long postId) {
        Users currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new GroupPostException(GroupPostErrorCode.UNAUTHORIZED);
        }

        groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.GROUP_NOT_FOUND));

        GroupPost post = groupPostRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new GroupPostException(GroupPostErrorCode.POST_NOT_FOUND));

        boolean isAuthor = post.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = groupMemberRepository
                .findByGroupIdAndUserId(groupId, currentUser.getId())
                .map(GroupMember::isAdmin)
                .orElse(false);

        if (!isAuthor && !isAdmin) {
            throw new GroupPostException(GroupPostErrorCode.FORBIDDEN);
        }

        post.setDeleted(true);
        groupPostRepository.save(post);
    }
}