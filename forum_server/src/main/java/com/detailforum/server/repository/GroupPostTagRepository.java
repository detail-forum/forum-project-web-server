package com.detailforum.server.repository;

import com.detailforum.server.entity.GroupPostTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupPostTagRepository extends JpaRepository<GroupPostTag, Long> {
    List<GroupPostTag> findByGroupPostId(Long groupPostId);
    void deleteByGroupPostId(Long groupPostId);
    
    @Query("SELECT gpt.groupPost.id FROM GroupPostTag gpt WHERE gpt.tag.name = :tagName AND gpt.groupPost.user.id = :userId AND gpt.groupPost.isDeleted = false")
    List<Long> findGroupPostIdsByTagNameAndUserId(@Param("tagName") String tagName, @Param("userId") Long userId);
}
