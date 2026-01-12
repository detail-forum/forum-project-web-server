package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.GroupChatReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupChatReadStatusRepository extends JpaRepository<GroupChatReadStatus, Long> {

    Optional<GroupChatReadStatus>
    findByUserIdAndChatRoomId(Long userId, Long chatRoomId);

    List<GroupChatReadStatus>
    findByUserIdAndChatRoomIdIn(Long userId, List<Long> chatRoomIds);

    @Query("""
        SELECT COUNT(m)
        FROM GroupChatMessage m
        WHERE m.chatRoom.id = :roomId
          AND m.isDeleted = false
          AND m.id > :lastReadMessageId
          AND m.user.id <> :userId
    """)
    long countUnreadMessage(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("lastReadMessageId") Long lastReadMessageId
    );
}