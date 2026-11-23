package com.detailforum.server.repository;

import com.detailforum.server.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    // 특정 댓글과 사용자의 좋아요 조회
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    // 특정 댓글의 좋아요 개수
    @Query("SELECT COUNT(cl) FROM CommentLike cl WHERE cl.comment.id = :commentId")
    long countByCommentId(@Param("commentId") Long commentId);

    // 사용자가 특정 댓글에 좋아요를 눌렀는지 확인
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
}

