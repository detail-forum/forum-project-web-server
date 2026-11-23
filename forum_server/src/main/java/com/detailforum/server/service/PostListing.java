package com.detailforum.server.service;

import com.detailforum.server.dto.PostListDTO;
import com.detailforum.server.entity.GroupPost;
import com.detailforum.server.entity.Post;
import com.detailforum.server.repository.GroupPostTagRepository;
import com.detailforum.server.repository.PostLikeRepository;
import com.detailforum.server.repository.PostTagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;

/**
 * 게시글 목록 항목 만들기와 공통 규칙(정렬, 일반·모임 필터, 페이지 자르기).
 * 글은 posts와 group_posts 두 테이블에 있어서, 목록마다 둘을 합친 뒤 메모리에서 정렬한다.
 */
// shortcut: 글마다 좋아요 수·태그를 따로 조회하고 전체를 메모리에서 정렬·페이지한다. 글이 수천 개를 넘으면 DB에서 합쳐 페이지하는 쿼리로 바꾼다.
@Component
@RequiredArgsConstructor
class PostListing {

    private static final LocalDateTime EPOCH_GUARD = LocalDateTime.of(1970, 1, 2, 0, 0);

    private final PostLikeRepository postLikeRepository;
    private final PostTagRepository postTagRepository;
    private final GroupPostTagRepository groupPostTagRepository;

    /** 수정 시각이 없거나 작성 시각보다 앞서면 작성 시각을 보여준다 */
    static LocalDateTime shownUpdatedTime(LocalDateTime created, LocalDateTime updated) {
        if (updated == null || updated.isBefore(created) || updated.isBefore(EPOCH_GUARD)) return created;
        return updated;
    }

    /** 정렬 기준(RESENT·HITS·LIKES, 그 밖은 최신순)에 맞는 조회를 고른다 */
    static <T> T bySort(String sortType, Supplier<T> recent, Supplier<T> hits, Supplier<T> likes) {
        if ("HITS".equalsIgnoreCase(sortType)) return hits.get();
        if ("LIKES".equalsIgnoreCase(sortType)) return likes.get();
        return recent.get();
    }

    /** groupFilter: GENERAL이면 일반 글만, GROUP이면 모임 글만, 그 밖은 전부 */
    static boolean matchesKind(Post post, String groupFilter) {
        if ("GENERAL".equalsIgnoreCase(groupFilter)) return post.getGroup() == null;
        if ("GROUP".equalsIgnoreCase(groupFilter)) return post.getGroup() != null;
        return true;
    }

    /** group_posts 테이블 글은 모두 모임 글이라 GENERAL 필터에서만 빠진다 */
    static boolean includesGroupPosts(String groupFilter) {
        return !"GENERAL".equalsIgnoreCase(groupFilter);
    }

    /** DB에서 정렬해 온 순서를 같은 값끼리의 순서로 두고(안정 정렬) 다시 정렬한 뒤 페이지를 자른다 */
    static Page<PostListDTO> sortAndPage(List<PostListDTO> items, String sortType, Pageable pageable) {
        List<PostListDTO> sorted = new ArrayList<>(items);
        sorted.sort(bySort(sortType,
                () -> Comparator.comparing(PostListDTO::getCreateDateTime).reversed(),
                () -> Comparator.comparingInt(PostListDTO::getViews).reversed(),
                () -> Comparator.comparingLong(PostListDTO::getLikeCount).reversed()));
        return PageWindows.slice(sorted, pageable);
    }

    List<String> tagsOf(Post post) {
        return postTagRepository.findByPostId(post.getId()).stream().map(pt -> pt.getTag().getName()).toList();
    }

    /** posts 테이블 글. 모임 글이면 모임 정보도 넣는다 */
    PostListDTO of(Post post) {
        PostListDTO.PostListDTOBuilder builder = base(post);
        if (post.getGroup() != null) {
            builder.groupId(post.getGroup().getId())
                    .groupName(post.getGroup().getName())
                    .isPublic(post.isPublic());
        }
        return builder.build();
    }

    /** posts 테이블 글. 모임 정보 없이 (사용자 프로필 목록) */
    PostListDTO withoutGroup(Post post) {
        return base(post).build();
    }

    /** group_posts 테이블 글. withTags가 false면 태그를 비워 둔다 (모임 화면 목록) */
    PostListDTO of(GroupPost groupPost, boolean withTags) {
        List<String> tags = withTags
                ? groupPostTagRepository.findByGroupPostId(groupPost.getId()).stream().map(t -> t.getTag().getName()).toList()
                : List.of();
        return PostListDTO.builder()
                .id(groupPost.getId())
                .title(groupPost.getTitle())
                .username(groupPost.getUser().getUsername())
                .views(groupPost.getViews())
                .createDateTime(groupPost.getCreatedTime())
                .updateDateTime(shownUpdatedTime(groupPost.getCreatedTime(), groupPost.getUpdatedTime()))
                .profileImageUrl(groupPost.getProfileImageUrl())
                .likeCount(postLikeRepository.countByGroupPostId(groupPost.getId()))
                .tags(tags)
                .groupId(groupPost.getGroup().getId())
                .groupName(groupPost.getGroup().getName())
                .isPublic(groupPost.isPublic())
                .build();
    }

    private PostListDTO.PostListDTOBuilder base(Post post) {
        return PostListDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .username(post.getUser().getUsername())
                .views(post.getViews())
                .createDateTime(post.getCreatedTime())
                .updateDateTime(shownUpdatedTime(post.getCreatedTime(), post.getUpdatedTime()))
                .profileImageUrl(post.getProfileImageUrl())
                .likeCount(postLikeRepository.countByPostId(post.getId()))
                .tags(tagsOf(post));
    }
}
