package com.detailforum.server.repository;

import com.detailforum.server.entity.GroupPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GroupPostRepository extends JpaRepository<GroupPost, Long> {
    Optional<GroupPost> findByIdAndIsDeletedFalse(Long id);
    Page<GroupPost> findByGroupIdAndIsDeletedFalseOrderByCreatedTimeDesc(Long groupId, Pageable pageable);
    
    // isPublic 필터링 포함
    @Query("SELECT gp FROM GroupPost gp WHERE gp.group.id = :groupId AND gp.isDeleted = false AND gp.isPublic = :isPublic ORDER BY gp.createdTime DESC")
    Page<GroupPost> findByGroupIdAndIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(@Param("groupId") Long groupId, @Param("isPublic") boolean isPublic, Pageable pageable);
    
    // 외부 공개 게시글만 조회 (전체 모임)
    @Query("SELECT gp FROM GroupPost gp WHERE gp.isDeleted = false AND gp.isPublic = true ORDER BY gp.createdTime DESC")
    Page<GroupPost> findByIsPublicAndIsDeletedFalseOrderByCreatedTimeDesc(Pageable pageable);
    
    @Modifying
    @Query("UPDATE GroupPost gp SET gp.views = gp.views + 1 WHERE gp.id = :id")
    void incrementViews(@Param("id") Long id);
    
    // 사용자 ID로 내가 작성한 모임 게시글 조회
    @Query("SELECT gp FROM GroupPost gp WHERE gp.user.id = :userId AND gp.isDeleted = false ORDER BY gp.createdTime DESC")
    Page<GroupPost> findByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT gp FROM GroupPost gp WHERE gp.user.id = :userId AND gp.isDeleted = false ORDER BY gp.views DESC")
    Page<GroupPost> findByUserIdAndIsDeletedFalseOrderByViewsDesc(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT gp FROM GroupPost gp WHERE gp.user.id = :userId AND gp.isDeleted = false ORDER BY (SELECT COUNT(pl) FROM PostLike pl WHERE pl.groupPost.id = gp.id) DESC, gp.createdTime DESC")
    Page<GroupPost> findByUserIdAndIsDeletedFalseOrderByLikesDesc(@Param("userId") Long userId, Pageable pageable);

    // ===== 관리자 화면 =====
    @Query("SELECT p FROM GroupPost p WHERE p.isDeleted = false AND (:keyword = '' OR p.title LIKE %:keyword%) ORDER BY p.id DESC")
    Page<GroupPost> searchForAdmin(@Param("keyword") String keyword, Pageable pageable);

    long countByIsDeletedFalse();
}
