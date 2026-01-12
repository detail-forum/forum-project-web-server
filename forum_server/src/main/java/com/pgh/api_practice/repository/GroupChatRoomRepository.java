package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.GroupChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupChatRoomRepository extends JpaRepository<GroupChatRoom, Long> {
    Optional<GroupChatRoom> findByIdAndIsDeletedFalse(Long id);
    List<GroupChatRoom> findByGroupIdAndIsDeletedFalseOrderByCreatedTimeAsc(Long groupId);
    List<GroupChatRoom> findByGroupIdInAndIsDeletedFalse(List<Long> groupIds);
}