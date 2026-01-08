package com.pgh.api_practice.repository;

import com.pgh.api_practice.entity.Users;
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
    @Query("SELECT u FROM Users u WHERE u.username = :username AND u.isDeleted = false ORDER BY u.id ASC")
    List<Users> findAllByUsername(@Param("username") String username);
    
    default Optional<Users> findByUsername(String username) {
        List<Users> users = findAllByUsername(username);
        return users.isEmpty() ? Optional.empty() : Optional.of(users.get(0));
    }
    
    Optional<Users> findByEmail(String email);
    Optional<Users> findByEmailVerificationToken(String token);
    
    /** 사용자 검색 (username 또는 nickname으로 검색) */
    @Query("SELECT u FROM Users u WHERE " +
           "u.isDeleted = false AND u.emailVerified = true AND " +
           "(LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY u.nickname ASC")
    List<Users> searchUsers(@Param("query") String query);
}