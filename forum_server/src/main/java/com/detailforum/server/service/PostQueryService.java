package com.detailforum.server.service;

import com.detailforum.server.dto.PostListDTO;
import com.detailforum.server.entity.Group;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.entity.Users;
import com.detailforum.server.exception.ResourceNotFoundException;
import com.detailforum.server.repository.GroupMemberRepository;
import com.detailforum.server.repository.GroupPostRepository;
import com.detailforum.server.repository.GroupPostTagRepository;
import com.detailforum.server.repository.GroupRepository;
import com.detailforum.server.repository.PostRepository;
import com.detailforum.server.repository.PostTagRepository;
import com.detailforum.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static com.detailforum.server.service.PostListing.bySort;
import static com.detailforum.server.service.PostListing.includesGroupPosts;
import static com.detailforum.server.service.PostListing.matchesKind;
import static com.detailforum.server.service.PostListing.sortAndPage;

/**
 * 게시글 목록 조회 (전체, 내 글, 태그, 검색, 사용자, 모임).
 * sortType: RESENT(최신)·HITS(조회수)·LIKES(좋아요), groupFilter: ALL·GENERAL·GROUP
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostQueryService {

    private static final Pageable ALL = Pageable.unpaged();

    private final PostRepository postRepository;
    private final GroupPostRepository groupPostRepository;
    private final PostTagRepository postTagRepository;
    private final GroupPostTagRepository groupPostTagRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;
    private final PostListing listing;

    /** 전체 목록: 일반 글 + 외부 공개 모임 글 (posts, group_posts 두 테이블) */
    public Page<PostListDTO> getPostList(Pageable pageable, String sortType, String groupFilter) {
        Page<Post> posts = bySort(sortType,
                () -> postRepository.findAllPublicPostsOrderByCreatedTimeDesc(ALL),
                () -> postRepository.findAllPublicPostsOrderByViewsDesc(ALL),
                () -> postRepository.findAllPublicPostsOrderByLikesDesc(ALL));

        List<PostListDTO> items = new ArrayList<>();
        posts.forEach(post -> {
            if (matchesKind(post, groupFilter)) items.add(listing.of(post));
        });
        if (includesGroupPosts(groupFilter)) {
            groupPostRepository.findByIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(ALL)
                    .forEach(gp -> items.add(listing.of(gp, true)));
        }
        return sortAndPage(items, sortType, pageable);
    }

    /** 내 글 (posts + group_posts, 비공개 모임 글 포함) */
    public Page<PostListDTO> getMyPostList(Pageable pageable, String sortType, String groupFilter) {
        Long userId = currentUser.require().getId();
        Page<Post> posts = bySort(sortType,
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(userId, ALL),
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(userId, ALL),
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByLikesDesc(userId, ALL));
        Page<GroupPost> groupPosts = bySort(sortType,
                () -> groupPostRepository.findByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(userId, ALL),
                () -> groupPostRepository.findByUserIdAndIsDeletedFalseOrderByViewsDesc(userId, ALL),
                () -> groupPostRepository.findByUserIdAndIsDeletedFalseOrderByLikesDesc(userId, ALL));

        List<PostListDTO> items = new ArrayList<>();
        posts.forEach(post -> {
            if (matchesKind(post, groupFilter)) items.add(listing.of(post));
        });
        if (includesGroupPosts(groupFilter)) {
            groupPosts.forEach(gp -> items.add(listing.of(gp, true)));
        }
        return sortAndPage(items, sortType, pageable);
    }

    /** 태그 목록: posts 테이블만 보며, 비공개 모임 글은 뺀다 */
    public Page<PostListDTO> getPostListByTag(Pageable pageable, String tagName, String sortType, String groupFilter) {
        List<Long> postIds = postTagRepository.findPostIdsByTagName(tagName);
        if (postIds.isEmpty()) {
            return new PageImpl<>(new ArrayList<>(), pageable, 0);
        }
        List<PostListDTO> items = postsByIds(postIds, sortType).stream()
                .filter(post -> matchesKind(post, groupFilter))
                .filter(post -> post.getGroup() == null || post.isPublic())
                .map(listing::of)
                .toList();
        return sortAndPage(items, sortType, pageable);
    }

    /** 내 글 중 태그가 붙은 것 (posts + group_posts) */
    public Page<PostListDTO> getMyPostListByTag(Pageable pageable, String tagName, String sortType, String groupFilter) {
        Long userId = currentUser.require().getId();
        List<PostListDTO> items = new ArrayList<>();

        List<Long> postIds = postTagRepository.findPostIdsByTagNameAndUserId(tagName, userId);
        if (!postIds.isEmpty()) {
            postsByIds(postIds, sortType).forEach(post -> {
                if (matchesKind(post, groupFilter)) items.add(listing.of(post));
            });
        }

        List<Long> groupPostIds = groupPostTagRepository.findGroupPostIdsByTagNameAndUserId(tagName, userId);
        if (!groupPostIds.isEmpty() && includesGroupPosts(groupFilter)) {
            groupPostRepository.findAllById(groupPostIds).stream()
                    .filter(gp -> !gp.isDeleted() && gp.getUser().getId().equals(userId))
                    .forEach(gp -> items.add(listing.of(gp, true)));
        }
        return sortAndPage(items, sortType, pageable);
    }

    /** 사용자 프로필의 글 목록: posts 테이블만, DB에서 바로 페이지한다 */
    public Page<PostListDTO> getUserPostList(String username, Pageable pageable, String sortType) {
        Long userId = findUser(username).getId();
        Page<Post> posts = bySort(sortType,
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(userId, pageable),
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(userId, pageable),
                () -> postRepository.findAllByUserIdAndIsDeletedFalseOrderByLikesDesc(userId, pageable));
        return posts.map(listing::withoutGroup);
    }

    public long getUserPostCount(String username) {
        return postRepository.findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(findUser(username).getId(), ALL)
                .getTotalElements();
    }

    /** 제목·본문 검색 (posts 테이블). 검색어가 없으면 전체 목록 */
    public Page<PostListDTO> searchPosts(Pageable pageable, String keyword, String sortType, String groupFilter) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getPostList(pageable, sortType, groupFilter);
        }
        String q = keyword.trim();
        Page<Post> posts = bySort(sortType,
                () -> postRepository.searchPostsByKeyword(q, ALL),
                () -> postRepository.searchPostsByKeywordOrderByViews(q, ALL),
                () -> postRepository.searchPostsByKeywordOrderByLikes(q, ALL));
        List<PostListDTO> items = posts.stream()
                .filter(post -> matchesKind(post, groupFilter))
                .map(listing::of)
                .toList();
        return sortAndPage(items, sortType, pageable);
    }

    /**
     * 모임 화면의 글 목록. 멤버가 아니면 isPublic과 관계없이 공개 글만 본다.
     * isPublic이 null이면(멤버만) 공개·비공개를 모두 본다.
     */
    public Page<PostListDTO> getGroupPostList(Long groupId, Pageable pageable, String sortType, Boolean isPublic) {
        Group group = groupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("모임을 찾을 수 없습니다."));
        boolean member = currentUser.find()
                .map(u -> group.getOwner().getId().equals(u.getId())
                        || groupMemberRepository.findByGroupIdAndUserId(groupId, u.getId()).isPresent())
                .orElse(false);
        Boolean publicFilter = member ? isPublic : Boolean.TRUE;

        Page<Post> posts = publicFilter != null
                ? bySort(sortType,
                    () -> postRepository.findByGroupIdAndIsPublicOrderByCreatedTimeDesc(groupId, publicFilter, ALL),
                    () -> postRepository.findByGroupIdAndIsPublicOrderByViewsDesc(groupId, publicFilter, ALL),
                    () -> postRepository.findByGroupIdAndIsPublicOrderByLikesDesc(groupId, publicFilter, ALL))
                : bySort(sortType,
                    () -> postRepository.findByGroupIdOrderByCreatedTimeDesc(groupId, ALL),
                    () -> postRepository.findByGroupIdOrderByViewsDesc(groupId, ALL),
                    () -> postRepository.findByGroupIdOrderByLikesDesc(groupId, ALL));
        Page<GroupPost> groupPosts = publicFilter != null
                ? groupPostRepository.findByGroupIdAndIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(groupId, publicFilter, ALL)
                : groupPostRepository.findByGroupIdAndIsDeletedFalseOrderByCreatedTimeDesc(groupId, ALL);

        List<PostListDTO> items = new ArrayList<>();
        posts.forEach(post -> items.add(listing.of(post)));
        groupPosts.forEach(gp -> items.add(listing.of(gp, false)));
        return sortAndPage(items, sortType, pageable);
    }

    /** 내가 쓴 글에 붙은 태그 이름 */
    public List<String> getMyTags() {
        return postTagRepository.findDistinctTagNamesByUserId(currentUser.require().getId());
    }

    private Page<Post> postsByIds(List<Long> ids, String sortType) {
        return bySort(sortType,
                () -> postRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(ids, ALL),
                () -> postRepository.findAllByIdInAndIsDeletedFalseOrderByViewsDesc(ids, ALL),
                () -> postRepository.findAllByIdInAndIsDeletedFalseOrderByLikesDesc(ids, ALL));
    }

    private Users findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("유저를 찾을 수 없습니다."));
    }
}
