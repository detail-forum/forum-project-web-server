package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.GroupPostTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupPostTagRepository extends JpaRepository<GroupPostTag, Long> {
    List<GroupPostTag> findByGroupPostId(Long groupPostId);
    void deleteByGroupPostId(Long groupPostId);
}
