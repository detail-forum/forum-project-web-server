package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    @Query("SELECT gm FROM GroupMember gm WHERE gm.group.id = :groupId")
    List<GroupMember> findByGroupId(@Param("groupId") Long groupId);
    List<GroupMember> findByUserId(Long userId);

    @Query("SELECT COUNT(gm) FROM GroupMember gm WHERE gm.group.id = :groupId")
    long countByGroupId(@Param("groupId") Long groupId);

    void deleteByGroupIdAndUserId(Long groupId, Long userId);

    // 멤버 여부 확인
    boolean existsByGroup_IdAndUser_Id(Long groupId, Long userId);

    // 관리자 여부 확인용
    Optional<GroupMember> findByGroup_IdAndUser_Id(Long groupId, Long userId);
}