package com.detailforum.server.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import com.detailforum.server.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<Users, Long> {
    /** username으로 사용자 조회 (중복 시 첫 번째 결과만 반환) */
    @Query(value = "SELECT * FROM users WHERE username = :username AND is_deleted = false ORDER BY id ASC LIMIT 1", nativeQuery = true)
    Optional<Users> findFirstByUsernameNative(@Param("username") String username);
    
    /** username으로 사용자 조회 (기존 메서드와 호환성을 위해 유지) */
    default Optional<Users> findByUsername(String username) {
        return findFirstByUsernameNative(username);
    }

    // ===== 관리자 화면 =====
    @Query("SELECT u FROM Users u WHERE u.isDeleted = false AND (:keyword = '' OR u.username LIKE %:keyword% OR u.nickname LIKE %:keyword% OR u.email LIKE %:keyword%) ORDER BY u.id DESC")
    Page<Users> searchForAdmin(@Param("keyword") String keyword, Pageable pageable);

    long countByIsDeletedFalse();

    long countByIsDeletedFalseAndSuspendedTrue();

    @Query("SELECT u.id FROM Users u WHERE u.isDeleted = false")
    List<Long> findActiveUserIds();
}
