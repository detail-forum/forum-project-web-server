package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Group;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    Optional<Group> findByIdAndIsDeletedFalse(Long id);
    Page<Group> findByIsDeletedFalseOrderByCreatedTimeDesc(Pageable pageable);
    Page<Group> findByIsDeletedFalseAndNameContainingIgnoreCaseOrderByCreatedTimeDesc(String name, Pageable pageable);
    
    // 주인이 특정 사용자인 모임 조회
    List<Group> findByOwnerIdAndIsDeletedFalseOrderByCreatedTimeDesc(Long ownerId);
    
    // ID 리스트로 모임 조회
    Page<Group> findByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(List<Long> ids, Pageable pageable);
}
