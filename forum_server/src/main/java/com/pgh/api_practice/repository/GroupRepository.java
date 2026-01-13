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
    long countByOwnerId(Long ownerId);
    Page<Group> findByIsDeletedFalseAndNameContainingIgnoreCaseOrderByCreatedTimeDesc(String name, Pageable pageable);
    
    // 주인이 특정 사용자인 모임 조회
    List<Group> findByOwnerIdAndIsDeletedFalseOrderByCreatedTimeDesc(Long ownerId);
    
    // ID 리스트로 모임 조회
    Page<Group> findByIdInAndIsDeletedFalseOrderByCreatedTimeDesc(List<Long> ids, Pageable pageable);
    
    /** 모임 검색 (이름 또는 설명으로 검색) - 강화된 검색 */
    @org.springframework.data.jpa.repository.Query("SELECT g FROM Group g WHERE " +
           "g.isDeleted = false AND " +
           "(LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(g.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY " +
           "CASE WHEN LOWER(g.name) = LOWER(:query) THEN 1 " +
           "     WHEN LOWER(g.name) LIKE LOWER(CONCAT(:query, '%')) THEN 2 " +
           "     WHEN LOWER(g.description) LIKE LOWER(CONCAT(:query, '%')) THEN 3 " +
           "     ELSE 4 END, " +
           "g.createdTime DESC")
    List<Group> searchGroups(@org.springframework.data.repository.query.Param("query") String query);

    List<Group> findByOwnerIdAndIsDeletedFalse(Long ownerId);
    List<Group> findByOwnerId(Long ownerId);
}