package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MessageReadRepository extends JpaRepository<MessageRead, Long> {
    
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
    
    @Query("SELECT COUNT(mr) FROM MessageRead mr WHERE mr.message.id = :messageId")
    int countByMessageId(@Param("messageId") Long messageId);
    
    Optional<MessageRead> findByMessageIdAndUserId(Long messageId, Long userId);
}
