package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.DirectChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DirectChatRoomRepository extends JpaRepository<DirectChatRoom, Long> {

    /** user1 < user2 규칙 기준 단건 조회 */
    Optional<DirectChatRoom> findByUser1IdAndUser2Id(Long user1Id, Long user2Id);

    /** 내가 참여한 모든 1대1 채팅방 목록 (최신순) */
    @Query("""
        select r
        from DirectChatRoom r
        where r.user1Id = :userId or r.user2Id = :userId
        order by r.updatedTime desc
    """)
    List<DirectChatRoom> findMyRooms(@Param("userId") Long userId);

    /** 채팅방 참여자 여부 확인 (Handshake / 권한 검증용) */
    @Query("""
        select count(r) > 0
        from DirectChatRoom r
        where r.id = :roomId
          and (r.user1Id = :userId or r.user2Id = :userId)
    """)
    boolean isParticipant(
            @Param("roomId") Long roomId,
            @Param("userId") Long userId
    );
}