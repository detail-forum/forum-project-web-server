package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findAllByIsDeletedFalseOrderByCreatedTimeDesc(Pageable pageable);
    Page<Post> findAllByIsDeletedFalseOrderByViewsDesc(Pageable pageable);

    Page<Post> findAllByUserIdAndIsDeletedFalseOrderByCreatedTimeDesc(Long userId, Pageable pageable);
    Page<Post> findAllByUserIdAndIsDeletedFalseOrderByViewsDesc(Long userId, Pageable pageable);

    // 조회수 증가 (updatedTime은 변경하지 않음)
    @Modifying
    @Query("UPDATE Post p SET p.views = p.views + 1 WHERE p.id = :id")
    void incrementViews(@Param("id") Long id);

    // 수정 시간 업데이트 (명시적으로)
    @Modifying
    @Query("UPDATE Post p SET p.updatedTime = :updateTime WHERE p.id = :id")
    void updateModifiedTime(@Param("id") Long id, @Param("updateTime") LocalDateTime updateTime);
}
