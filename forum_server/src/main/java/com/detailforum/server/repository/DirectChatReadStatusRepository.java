package com.detailforum.server.repository;

import com.detailforum.server.entity.DirectChatReadStatus;
import com.detailforum.server.entity.DirectChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DirectChatReadStatusRepository
        extends JpaRepository<DirectChatReadStatus, Long> {

    Optional<DirectChatReadStatus> findByChatRoomAndUserId(
            DirectChatRoom chatRoom,
            Long userId
    );
}