package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findAllByIsDeletedFalseOrderByCreatedTimeDesc(Pageable pageable);
    Page<Post> findAllByIsDeletedFalseOrderByViewsDesc(Pageable pageable);
    
    // 모임 외부 노출 게시글만 조회 (group이 null이거나 isPublic이 true)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) ORDER BY p.createdTime DESC")
    Page<Post> findAllPublicPostsOrderByCreatedTimeDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) ORDER BY p.views DESC")
    Page<Post> findAllPublicPostsOrderByViewsDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> findAllPublicPostsOrderByLikesDesc(Pageable pageable);

    Page<Post> findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(Long userId, Pageable pageable);
    Page<Post> findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(Long userId, Pageable pageable);
    
    // 좋아요 순서로 정렬 (서브쿼리 사용)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> findAllByIsDeletedFalseOrderByLikesDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.user.id = :userId AND p.isDeleted = false ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> findAllByUserIdAndIsDeletedFalseOrderByLikesDesc(@Param("userId") Long userId, Pageable pageable);

    // 조회수 증가 (updatedTime은 변경하지 않음)
    @Modifying
    @Query("UPDATE Post p SET p.views = p.views + 1 WHERE p.id = :id")
    void incrementViews(@Param("id") Long id);

    // 수정 시간 업데이트 (명시적으로)
    @Modifying
    @Query("UPDATE Post p SET p.updatedTime = :updateTime WHERE p.id = :id")
    void updateModifiedTime(@Param("id") Long id, @Param("updateTime") LocalDateTime updateTime);
    
    // 태그 필터링을 위한 메서드들
    @Query("SELECT p FROM Post p WHERE p.id IN :ids AND p.isDeleted = false ORDER BY p.createdTime DESC")
    Page<Post> findAllByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(@Param("ids") List<Long> ids, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.id IN :ids AND p.isDeleted = false ORDER BY p.views DESC")
    Page<Post> findAllByIdInAndIsDeletedFalseOrderByViewsDesc(@Param("ids") List<Long> ids, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.id IN :ids AND p.isDeleted = false ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> findAllByIdInAndIsDeletedFalseOrderByLikesDesc(@Param("ids") List<Long> ids, Pageable pageable);
    
    // 검색 기능: 제목과 본문에서 검색 (모임 외부 노출 게시글만)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) AND (p.title LIKE %:keyword% OR p.body LIKE %:keyword%) ORDER BY p.createdTime DESC")
    Page<Post> searchPostsByKeyword(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) AND (p.title LIKE %:keyword% OR p.body LIKE %:keyword%) ORDER BY p.views DESC")
    Page<Post> searchPostsByKeywordOrderByViews(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND (p.group IS NULL OR p.isPublic = true) AND (p.title LIKE %:keyword% OR p.body LIKE %:keyword%) ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> searchPostsByKeywordOrderByLikes(@Param("keyword") String keyword, Pageable pageable);
    
    // 모임별 게시글 조회 (모임 멤버는 모든 게시글 조회 가능, 외부는 공개 게시글만)
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.group.id = :groupId ORDER BY p.createdTime DESC")
    Page<Post> findByGroupIdOrderByCreatedTimeDesc(@Param("groupId") Long groupId, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.group.id = :groupId ORDER BY p.views DESC")
    Page<Post> findByGroupIdOrderByViewsDesc(@Param("groupId") Long groupId, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.isDeleted = false AND p.group.id = :groupId ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = p.id) DESC, p.createdTime DESC")
    Page<Post> findByGroupIdOrderByLikesDesc(@Param("groupId") Long groupId, Pageable pageable);
}
