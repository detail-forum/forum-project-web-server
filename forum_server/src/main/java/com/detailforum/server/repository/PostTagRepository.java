package com.detailforum.server.repository;

import com.detailforum.server.entity.PostTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostTagRepository extends JpaRepository<PostTag, Long> {
    List<PostTag> findByPostId(Long postId);
    void deleteByPostId(Long postId);
    
    @Query("SELECT pt.post.id FROM PostTag pt WHERE pt.tag.name = :tagName AND pt.post.isDeleted = false")
    List<Long> findPostIdsByTagName(@Param("tagName") String tagName);
    
    @Query("SELECT pt.post.id FROM PostTag pt WHERE pt.tag.name = :tagName AND pt.post.user.id = :userId AND pt.post.isDeleted = false")
    List<Long> findPostIdsByTagNameAndUserId(@Param("tagName") String tagName, @Param("userId") Long userId);
    
    @Query("SELECT DISTINCT pt.tag.name FROM PostTag pt WHERE pt.post.user.id = :userId AND pt.post.isDeleted = false ORDER BY pt.tag.name")
    List<String> findDistinctTagNamesByUserId(@Param("userId") Long userId);
}
