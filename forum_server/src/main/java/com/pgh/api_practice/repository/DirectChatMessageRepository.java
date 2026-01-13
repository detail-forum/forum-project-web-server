package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.DirectChatMessage;
import com.pgh.api_practice.entity.DirectChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DirectChatMessageRepository
        extends JpaRepository<DirectChatMessage, Long> {

    Optional<DirectChatMessage> findTopByChatRoomOrderByCreatedTimeDesc(
            DirectChatRoom chatRoom
    );

    Page<DirectChatMessage> findByChatRoomOrderByCreatedTimeDesc(
            DirectChatRoom chatRoom,
            Pageable pageable
    );

    @Query("""
        select count(m)
        from DirectChatMessage m
        where m.chatRoom = :room
          and m.senderId <> :userId
          and (
                :lastReadMessageId is null
                or m.id > :lastReadMessageId
          )
          and m.isDeleted = false
    """)
    long countUnreadMessages(
            @Param("room") DirectChatRoom room,
            @Param("userId") Long userId,
            @Param("lastReadMessageId") Long lastReadMessageId
    );

    @Query("""
        SELECT m
        FROM DirectChatMessage m
        WHERE m.chatRoom.id = :chatRoomId
          AND m.isDeleted = false
          AND m.message IS NOT NULL
          AND m.message LIKE %:query%
        ORDER BY m.createdTime DESC
    """)
    Page<DirectChatMessage> searchInRoom(
            @Param("chatRoomId") Long chatRoomId,
            @Param("query") String query,
            Pageable pageable
    );
}