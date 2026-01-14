package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.GroupChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupChatMessageRepository extends JpaRepository<GroupChatMessage, Long> {

    /* =========================
       채팅 메시지 목록 조회 (ASC 고정)
       ========================= */
    @Query("""
        SELECT m
        FROM GroupChatMessage m
        WHERE m.chatRoom.id = :chatRoomId
          AND m.isDeleted = false
        ORDER BY m.createdTime ASC
    """)
    List<GroupChatMessage> findMessagesAsc(
            @Param("chatRoomId") Long chatRoomId,
            Pageable pageable
    );

    /* =========================
       채팅방별 마지막 메시지 (목록용)
       ========================= */
    @Query("""
        SELECT m
        FROM GroupChatMessage m
        WHERE m.chatRoom.id IN :roomIds
          AND m.isDeleted = false
          AND m.createdTime = (
              SELECT MAX(m2.createdTime)
              FROM GroupChatMessage m2
              WHERE m2.chatRoom.id = m.chatRoom.id
                AND m2.isDeleted = false
          )
    """)
    List<GroupChatMessage> findLastMessagesByRoomIds(
            @Param("roomIds") List<Long> roomIds
    );

    /* =========================
       안 읽은 메시지 수 계산
       ========================= */
    @Query("""
        SELECT COUNT(m)
        FROM GroupChatMessage m
        WHERE m.chatRoom.id = :roomId
          AND m.isDeleted = false
          AND m.user.id <> :userId
          AND m.id > :lastReadMessageId
    """)
    long countUnreadMessages(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId,
            @Param("lastReadMessageId") Long lastReadMessageId
    );

    /* =========================
       채팅방 내 메시지 검색 (DESC 유지)
       ========================= */
    @Query("""
        SELECT m
        FROM GroupChatMessage m
        WHERE m.chatRoom.id = :chatRoomId
          AND m.isDeleted = false
          AND m.message IS NOT NULL
          AND m.message LIKE %:query%
        ORDER BY m.createdTime DESC
    """)
    Page<GroupChatMessage> searchInRoom(
            @Param("chatRoomId") Long chatRoomId,
            @Param("query") String query,
            Pageable pageable
    );
}