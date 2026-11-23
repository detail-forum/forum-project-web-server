package com.detailforum.server.repository;

import com.detailforum.server.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AuthRepository extends JpaRepository<Users, Long> {
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByNickname(String nickname);
    
    /** username으로 사용자 조회 (중복 시 첫 번째 결과만 반환) */
    @Query(value = "SELECT * FROM users WHERE username = :username AND is_deleted = false ORDER BY id ASC LIMIT 1", nativeQuery = true)
    Optional<Users> findFirstByUsernameNative(@Param("username") String username);
    
    /** username으로 사용자 조회 (기존 메서드와 호환성을 위해 유지) */
    default Optional<Users> findByUsername(String username) {
        return findFirstByUsernameNative(username);
    }
    
    Optional<Users> findByEmail(String email);
    Optional<Users> findByEmailVerificationToken(String token);
    Optional<Users> findByPasswordResetTokenHash(String tokenHash);
    
    /** 사용자 검색 (username 또는 nickname으로 검색) - 강화된 검색 */
    @Query("SELECT u FROM Users u WHERE " +
           "u.isDeleted = false AND u.emailVerified = true AND " +
           "(LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY " +
           "CASE WHEN LOWER(u.username) = LOWER(:query) THEN 1 " +
           "     WHEN LOWER(u.nickname) = LOWER(:query) THEN 2 " +
           "     WHEN LOWER(u.username) LIKE LOWER(CONCAT(:query, '%')) THEN 3 " +
           "     WHEN LOWER(u.nickname) LIKE LOWER(CONCAT(:query, '%')) THEN 4 " +
           "     ELSE 5 END, " +
           "u.nickname ASC")
    List<Users> searchUsers(@Param("query") String query);
}