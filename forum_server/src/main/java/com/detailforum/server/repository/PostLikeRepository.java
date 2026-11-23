package com.detailforum.server.repository;

import com.detailforum.server.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    
    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);
    
    @Query("SELECT pl FROM PostLike pl WHERE pl.groupPost.id = :groupPostId AND pl.user.id = :userId")
    Optional<PostLike> findByGroupPostIdAndUserId(@Param("groupPostId") Long groupPostId, @Param("userId") Long userId);
    
    boolean existsByPostIdAndUserId(Long postId, Long userId);
    
    @Query("SELECT COUNT(pl) > 0 FROM PostLike pl WHERE (pl.groupPost.id = :groupPostId AND pl.user.id = :userId)")
    boolean existsByGroupPostIdAndUserId(@Param("groupPostId") Long groupPostId, @Param("userId") Long userId);
    
    void deleteByPostIdAndUserId(Long postId, Long userId);
    
    @Query("SELECT COUNT(pl) FROM PostLike pl WHERE pl.post.id = :postId")
    long countByPostId(@Param("postId") Long postId);
    
    @Query("SELECT COUNT(pl) FROM PostLike pl WHERE pl.groupPost.id = :groupPostId")
    long countByGroupPostId(@Param("groupPostId") Long groupPostId);
}
